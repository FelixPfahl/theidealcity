using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace Inka;

public class MainForm : Form
{
    readonly WebView2 web = new() { Dock = DockStyle.Fill };
    readonly string startArg;
    string playState = "";
    readonly System.Windows.Forms.Timer updTimer = new() { Interval = 6 * 3600 * 1000 };

    [DllImport("kernel32.dll")] static extern uint SetThreadExecutionState(uint esFlags);
    const uint ES_CONTINUOUS = 0x80000000, ES_SYSTEM_REQUIRED = 0x00000001;

    public MainForm(string arg)
    {
        startArg = arg;
        Text = "Inka";
        Width = 520; Height = 960;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.White;
        try { Icon = Icon.ExtractAssociatedIcon(Environment.ProcessPath ?? Application.ExecutablePath); } catch { }
        Controls.Add(web);
        Load += async (_, _) => await Init();
        FormClosed += (_, _) =>
        {
            SetThreadExecutionState(ES_CONTINUOUS);
            // Update beim Schließen still installieren (Josef 1.11.2026: nie während der Show)
            if (Updater.PendingPath != null) Updater.Install(false);
        };
        updTimer.Tick += async (_, _) => await Updater.Check(ReportUpdate);
        NetworkChange.NetworkAvailabilityChanged += (_, e) => BeginInvoke(() => Js("window.__inkaNative&&window.__inkaNative({type:'net',online:" + (e.IsAvailable ? "true" : "false") + "})"));
    }

    async Task Init()
    {
        // Show läuft auch im minimierten Fenster ungebremst weiter
        var opts = new CoreWebView2EnvironmentOptions("--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --autoplay-policy=no-user-gesture-required");
        var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(Program.Dir, "WebView2"), opts);
        await web.EnsureCoreWebView2Async(env);
        var cw = web.CoreWebView2;
        cw.Settings.AreDefaultContextMenusEnabled = true;
        cw.Settings.IsStatusBarEnabled = false;
        cw.Settings.UserAgent = cw.Settings.UserAgent + " InkaWin/1.0";
        // Schnittstelle zur Seite; auf Windows spielt die Spotify-App am PC (Spotify Connect)
        await cw.AddScriptToExecuteOnDocumentCreatedAsync(
            "window.InkaWin={post:function(m){try{window.chrome.webview.postMessage(JSON.stringify(m));}catch(e){}}};" +
            "try{if(localStorage.getItem('inka:noSdk')===null)localStorage.setItem('inka:noSdk','true');}catch(e){}");
        cw.WebMessageReceived += (_, e) => OnMessage(e.TryGetWebMessageAsString());
        cw.NavigationStarting += (_, e) =>
        {
            var u = e.Uri ?? "";
            if (u.StartsWith("inka:", StringComparison.OrdinalIgnoreCase)) { e.Cancel = true; OpenFromOutside(u); return; }
            if (Inside(u)) return;
            e.Cancel = true; Open(u);
        };
        cw.NewWindowRequested += (_, e) => { e.Handled = true; Open(e.Uri); };
        cw.PermissionRequested += (_, e) =>
        {
            if (e.PermissionKind == CoreWebView2PermissionKind.Microphone || e.PermissionKind == CoreWebView2PermissionKind.Autoplay)
                e.State = CoreWebView2PermissionState.Allow;
        };
        cw.NavigationCompleted += (_, _) => ReportUpdate(Updater.LastState);
        if (!string.IsNullOrWhiteSpace(startArg) && startArg.StartsWith("inka:", StringComparison.OrdinalIgnoreCase)) OpenFromOutside(startArg);
        else Go();
        updTimer.Start();
        _ = Updater.Check(ReportUpdate);
    }

    static bool Inside(string u) =>
        u.StartsWith("https://raw.githack.com/", StringComparison.OrdinalIgnoreCase) ||
        u.StartsWith("https://accounts.spotify.com/", StringComparison.OrdinalIgnoreCase) ||
        u.StartsWith("about:", StringComparison.OrdinalIgnoreCase);

    static void Open(string u)
    {
        try { Process.Start(new ProcessStartInfo(u) { UseShellExecute = true }); } catch { }
    }

    void Go()
    {
        var k = Program.Key;
        web.CoreWebView2?.Navigate(Program.Page + (k.Length > 0 ? "#k=" + k : ""));
    }

    /// <summary>inka://open?k=&lt;Schlüssel&gt;</summary>
    public void OpenFromOutside(string uri)
    {
        try
        {
            if (WindowState == FormWindowState.Minimized) WindowState = FormWindowState.Normal;
            Activate();
            if (string.IsNullOrWhiteSpace(uri)) return;
            var q = uri.Contains('?') ? uri[(uri.IndexOf('?') + 1)..] : "";
            foreach (var part in q.Split('&'))
            {
                var kv = part.Split('=', 2);
                if (kv.Length == 2 && kv[0] == "k") Program.Key = Uri.UnescapeDataString(kv[1]);
            }
            if (web.CoreWebView2 != null) Go();
        }
        catch { }
    }

    void OnMessage(string json)
    {
        try
        {
            using var d = JsonDocument.Parse(json);
            var r = d.RootElement;
            var type = r.GetProperty("type").GetString();
            if (type == "np")
            {
                var st = r.TryGetProperty("state", out var s) ? s.GetString() : "";
                playState = st ?? "";
                var title = r.TryGetProperty("title", out var t) ? t.GetString() : "";
                // PC während der Show nicht schlafen lassen
                SetThreadExecutionState(st == "playing" || st == "paused" ? ES_CONTINUOUS | ES_SYSTEM_REQUIRED : ES_CONTINUOUS);
                Text = string.IsNullOrEmpty(title) ? "Inka" : "Inka · " + title;
            }
            else if (type == "update-check") _ = Updater.Check(ReportUpdate);
            else if (type == "update-install")
            {
                if (playState == "playing") { Js("window.toast&&toast('Update nach der Show: läuft gerade.')"); return; }
                if (Updater.Install(true)) { Updater.Forget(); Application.Exit(); }
            }
            else if (type == "openSpotify")
            {
                try { Process.Start(new ProcessStartInfo("spotify:") { UseShellExecute = true }); } catch { }
            }
        }
        catch { }
    }

    void ReportUpdate(string state)
    {
        if (InvokeRequired) { BeginInvoke(() => ReportUpdate(state)); return; }
        var o = JsonSerializer.Serialize(new { type = "update", state, current = Updater.CurrentText, version = Updater.PendingVersion ?? "" });
        Js("window.__inkaNative&&window.__inkaNative(" + o + ")");
    }

    void Js(string code) { try { web.CoreWebView2?.ExecuteScriptAsync(code); } catch { } }
}
