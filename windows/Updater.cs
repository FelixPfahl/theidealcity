using System.Diagnostics;
using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;

namespace Inka;

/// <summary>Updates (Josef 1.11.2026): beim Start und alle 6 Stunden prüfen, im Hintergrund laden,
/// installieren beim Schließen oder per Knopf, nie während einer laufenden Show.</summary>
public static class Updater
{
    public const string VersionUrl = "https://raw.githubusercontent.com/FelixPfahl/theidealcity/inka/app/version.json";
    static readonly HttpClient Http = new() { Timeout = TimeSpan.FromMinutes(15) };

    public static Version Current => Assembly.GetExecutingAssembly().GetName().Version ?? new Version(1, 0);
    public static string CurrentText => $"{Current.Major}.{Current.Minor}.{Math.Max(0, Current.Build)}";
    public static string PendingPath { get; private set; }
    public static string PendingVersion { get; private set; }
    public static string LastState { get; private set; } = "";
    static bool busy;

    public static async Task Check(Action<string> report)
    {
        if (busy) return;
        busy = true;
        try
        {
            var json = await Http.GetStringAsync(VersionUrl + "?x=" + DateTime.UtcNow.Ticks);
            using var d = JsonDocument.Parse(json);
            var w = d.RootElement.GetProperty("windows");
            var v = w.GetProperty("version").GetString() ?? "0.0.0";
            var url = w.GetProperty("url").GetString() ?? "";
            var sha = (w.TryGetProperty("sha256", out var s) ? s.GetString() : "")?.ToLowerInvariant() ?? "";
            if (!Version.TryParse(v, out var nv) || nv <= new Version(Current.Major, Current.Minor, Math.Max(0, Current.Build)))
            { LastState = "aktuell"; report(LastState); return; }

            var dir = Path.Combine(Program.Dir, "update");
            Directory.CreateDirectory(dir);
            foreach (var old in Directory.GetFiles(dir, "Inka-Setup-*.exe"))
                if (!old.EndsWith($"Inka-Setup-{v}.exe")) try { File.Delete(old); } catch { }
            var target = Path.Combine(dir, $"Inka-Setup-{v}.exe");
            if (!(File.Exists(target) && Sha(target) == sha))
            {
                LastState = "lädt"; report(LastState);
                var tmp = target + ".part";
                await using (var src = await Http.GetStreamAsync(url + "?x=" + DateTime.UtcNow.Ticks))
                await using (var dst = File.Create(tmp)) await src.CopyToAsync(dst);
                if (sha.Length > 0 && Sha(tmp) != sha) { File.Delete(tmp); LastState = "fehler: Prüfsumme"; report(LastState); return; }
                if (File.Exists(target)) File.Delete(target);
                File.Move(tmp, target);
            }
            PendingPath = target; PendingVersion = v;
            LastState = "bereit"; report(LastState);
        }
        catch (Exception e) { LastState = "fehler: " + e.GetType().Name; report(LastState); }
        finally { busy = false; }
    }

    static string Sha(string path)
    {
        using var f = File.OpenRead(path);
        return Convert.ToHexString(SHA256.HashData(f)).ToLowerInvariant();
    }

    public static void Forget() { PendingPath = null; }

    /// <summary>Startet das Setup still. restart: Inka danach wieder öffnen.</summary>
    public static bool Install(bool restart)
    {
        if (PendingPath == null || !File.Exists(PendingPath)) return false;
        try { Process.Start(new ProcessStartInfo(PendingPath, restart ? "/S /RUN" : "/S") { UseShellExecute = true }); return true; }
        catch { return false; }
    }
}
