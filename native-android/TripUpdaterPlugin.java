package com.tripfriend.app;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.Arrays;
import javax.net.ssl.HttpsURLConnection;
import java.util.concurrent.atomic.AtomicBoolean;

@CapacitorPlugin(name = "TripUpdater")
public class TripUpdaterPlugin extends Plugin {
    private final AtomicBoolean running = new AtomicBoolean();
    private static final long MAX_APK_BYTES = 100L * 1024 * 1024;

    @PluginMethod
    public void install(PluginCall call) {
        String version = call.getString("version", "");
        if (!version.matches("v[0-9]{1,5}\\.[0-9]{1,5}\\.[0-9]{1,5}")) {
            call.reject("Invalid release version.");
            return;
        }
        PackageManager manager = getContext().getPackageManager();
        String packageName = getContext().getPackageName();
        if (android.os.Build.VERSION.SDK_INT >= 26 && !manager.canRequestPackageInstalls()) {
            getActivity().runOnUiThread(() -> {
                try {
                    getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + packageName)));
                    call.reject("Allow installs from Trip Friend, return here, then tap Update again.");
                } catch (Exception error) {
                    call.reject("Android does not allow this app to install updates.");
                }
            });
            return;
        }
        if (!running.compareAndSet(false, true)) {
            call.reject("An update is already downloading.");
            return;
        }
        new Thread(() -> {
            File folder = new File(getContext().getCacheDir(), "updates");
            File file = new File(folder, "TripFriend.apk");
            try {
                if (!folder.isDirectory() && !folder.mkdirs()) throw new IllegalStateException();
                download(version, file);
                verify(manager, packageName, file);
                Uri uri = FileProvider.getUriForFile(getContext(), packageName + ".fileprovider", file);
                getActivity().runOnUiThread(() -> {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW)
                            .setDataAndType(uri, "application/vnd.android.package-archive")
                            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        getActivity().startActivity(intent);
                        call.resolve();
                    } catch (Exception error) {
                        call.reject("Android could not open the installer.");
                    } finally {
                        running.set(false);
                    }
                });
            } catch (Exception error) {
                file.delete();
                running.set(false);
                call.reject("Could not prepare this update. Check your connection and that the release uses the same signing key.");
            }
        }).start();
    }

    private void download(String version, File file) throws Exception {
        URL url = new URL("https://github.com/kothakula-sagar/trip-friend/releases/download/" + version + "/TripFriend.apk");
        for (int redirect = 0; redirect < 5; redirect++) {
            if (!url.getProtocol().equals("https")) throw new IllegalStateException();
            HttpsURLConnection connection = (HttpsURLConnection) url.openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            try {
                int status = connection.getResponseCode();
                if (status >= 300 && status < 400) {
                    String next = connection.getHeaderField("Location");
                    if (next == null) throw new IllegalStateException();
                    url = new URL(url, next);
                    continue;
                }
                if (status != 200 || connection.getContentLengthLong() > MAX_APK_BYTES) throw new IllegalStateException();
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(file)) {
                    byte[] buffer = new byte[32768];
                    long total = 0;
                    int count;
                    while ((count = input.read(buffer)) != -1) {
                        total += count;
                        if (total > MAX_APK_BYTES) throw new IllegalStateException();
                        output.write(buffer, 0, count);
                    }
                }
                return;
            } finally {
                connection.disconnect();
            }
        }
        throw new IllegalStateException();
    }

    @SuppressWarnings("deprecation")
    private void verify(PackageManager manager, String packageName, File file) throws Exception {
        PackageInfo installed = manager.getPackageInfo(packageName, PackageManager.GET_SIGNATURES);
        PackageInfo candidate = manager.getPackageArchiveInfo(file.getAbsolutePath(), PackageManager.GET_SIGNATURES);
        if (candidate == null || !packageName.equals(candidate.packageName)
                || candidate.versionCode <= installed.versionCode
                || installed.signatures == null || !Arrays.equals(installed.signatures, candidate.signatures)) {
            throw new IllegalArgumentException();
        }
    }
}
