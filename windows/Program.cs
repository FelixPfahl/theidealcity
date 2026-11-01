using System.IO.Pipes;
using Microsoft.Win32;

namespace Inka;

/// <summary>Inka für Windows (Josef 1.11.2026): die Inka-Seite in einem eigenen Fenster (WebView2),
/// hält den PC während der Show wach, erkennt Netzabbrüche, startet bei Bedarf die Spotify-App.</summary>
static class Program
{
    public const string Page = "https://raw.githack.com/FelixPfahl/theidealcity/inka/index.html";
    public static readonly string Dir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Inka");
    const string PipeName = "InkaApp_Pipe";

    [STAThread]
    static void Main(string[] args)
    {
        Directory.CreateDirectory(Dir);
        using var mutex = new Mutex(true, "InkaApp_Einmal", out bool first);
        if (!first) { Forward(args.FirstOrDefault() ?? ""); return; }
        RegisterProtocol();
        ApplicationConfiguration.Initialize();
        var form = new MainForm(args.FirstOrDefault());
        StartPipe(form);
        Application.Run(form);
    }

    /// <summary>inka://open?k=... aus dem Browser an das laufende Fenster weitergeben.</summary>
    static void Forward(string arg)
    {
        try { using var c = new NamedPipeClientStream(".", PipeName, PipeDirection.Out); c.Connect(2000); using var w = new StreamWriter(c); w.Write(arg); }
        catch { }
    }

    static void StartPipe(MainForm form)
    {
        var t = new Thread(() =>
        {
            while (true)
            {
                try
                {
                    using var s = new NamedPipeServerStream(PipeName, PipeDirection.In);
                    s.WaitForConnection();
                    using var r = new StreamReader(s);
                    var msg = r.ReadToEnd();
                    form.BeginInvoke(() => form.OpenFromOutside(msg));
                }
                catch { Thread.Sleep(500); }
            }
        }) { IsBackground = true };
        t.Start();
    }

    /// <summary>Damit der Knopf "In der App öffnen" (inka://...) im Browser dieses Programm startet.</summary>
    static void RegisterProtocol()
    {
        try
        {
            var exe = Environment.ProcessPath ?? Application.ExecutablePath;
            using var k = Registry.CurrentUser.CreateSubKey(@"Software\Classes\inka");
            k.SetValue("", "URL:Inka");
            k.SetValue("URL Protocol", "");
            using var cmd = k.CreateSubKey(@"shell\open\command");
            cmd.SetValue("", "\"" + exe + "\" \"%1\"");
        }
        catch { }
    }

    public static string Key
    {
        get { try { return File.ReadAllText(Path.Combine(Dir, "schluessel.txt")).Trim(); } catch { return ""; } }
        set { try { File.WriteAllText(Path.Combine(Dir, "schluessel.txt"), value ?? ""); } catch { } }
    }
}
