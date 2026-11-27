import {cp,copyFile,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {existsSync} from 'node:fs';

await rm('www',{recursive:true,force:true});
await mkdir('www');
const files = ['app.html','app.js','aurora.css','icons.svg','crown.svg','icon.svg','icon-192.png','icon-512.png','manifest.webmanifest','release.js',
  'trips.html','trips.js','trip-map.js','map-config.js','firebase-config.js','help.html','help.js','android-shell.css','android-shell.js','real-trip.js','polls.js','crew-ui.js','trip-notifications.js','native-update.js'];
for (const file of files) await copyFile(file,'www/'+file);
await cp('photos','www/photos',{recursive:true});
await writeFile('www/android-config.json',JSON.stringify({push:existsSync('google-services.json')}));
await writeFile('www/index.html','<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=trips.html#trips"><title>Trip Friend</title><a href="trips.html#trips">Open Trip Friend</a></html>');
if (!existsSync('android/app/build.gradle')) process.exit(0);

const metadata = JSON.parse(await readFile('release.json','utf8'));
if (!/^\d+\.\d+\.\d+$/.test(metadata.version) || !Number.isSafeInteger(metadata.androidVersionCode) || metadata.androidVersionCode < 1) {
  throw new Error('Set version and androidVersionCode in release.json');
}
const gradlePath = 'android/app/build.gradle';
const gradle = await readFile(gradlePath,'utf8');
await writeFile(gradlePath,gradle.replace(/versionCode\s+\d+/,'versionCode '+metadata.androidVersionCode).replace(/versionName\s+"[^"]+"/,'versionName "'+metadata.version+'"'));

const main = 'android/app/src/main';
const manifestPath = main+'/AndroidManifest.xml';
let manifest = await readFile(manifestPath,'utf8');
const additions = [
  '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />',
  '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />',
  '<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />',
  '<uses-feature android:name="android.hardware.location.gps" android:required="false" />'
];
const permissions = additions.filter(element => !manifest.includes(element.match(/android:name="([^"]+)/)[1]));
manifest = manifest.replace('</manifest>',permissions.join('\n')+'\n</manifest>');
if (!manifest.includes('android:scheme="tripfriend"')) {
  manifest = manifest.replace('</activity>',`<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="tripfriend" android:host="trip" />
  </intent-filter></activity>`);
}
await writeFile(manifestPath,manifest);

const java = main+'/java/com/tripfriend/app';
await copyFile('native-android/TripUpdaterPlugin.java',java+'/TripUpdaterPlugin.java');
await writeFile(java+'/MainActivity.java',`package com.tripfriend.app;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle state) {
    registerPlugin(TripUpdaterPlugin.class);
    super.onCreate(state);
  }
}
`);
const res = main+'/res';
const icon = `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#FBF7EE" android:strokeColor="#AF8521" android:strokeWidth="2" android:pathData="M54,26a28,28 0,1 0,0 56a28,28 0,1 0,0 -56"/>
  <path android:fillColor="#00000000" android:strokeColor="#9B7416" android:strokeWidth="2" android:strokeLineJoin="round" android:pathData="M38,47 L46,52 L54,40 L62,52 L70,47 L66,65 L42,65 Z"/>
</vector>`;
await mkdir(res+'/raw',{recursive:true});
execFileSync(process.execPath,['scripts/notification-audio.mjs',res+'/raw']);
const rate = 16000;
const samples = rate * 2;
const wave = Buffer.alloc(44+samples*2);
wave.write('RIFF'); wave.writeUInt32LE(wave.length-8,4); wave.write('WAVEfmt ',8);
wave.writeUInt32LE(16,16); wave.writeUInt16LE(1,20); wave.writeUInt16LE(1,22);
wave.writeUInt32LE(rate,24); wave.writeUInt32LE(rate*2,28); wave.writeUInt16LE(2,32); wave.writeUInt16LE(16,34);
wave.write('data',36); wave.writeUInt32LE(samples*2,40);
for (let i=0;i<samples;i++) {
  const beat = i/rate % 1;
  const gain = Math.max(0,Math.min(1,beat*40,(.34-beat)*14));
  wave.writeInt16LE(Math.round(Math.sin(2*Math.PI*660*i/rate)*4200*gain),44+i*2);
}
await writeFile(res+'/raw/ringtone.wav',wave);
await mkdir(res+'/drawable',{recursive:true});
await writeFile(res+'/drawable/trip_crown.xml',icon);
await writeFile(res+'/drawable/ic_trip_notification.xml',`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24"><path android:fillColor="#FFFFFF" android:pathData="M3,6L8,9L12,4L16,9L21,6L18,18L6,18ZM6,20L18,20L18,22L6,22Z"/></vector>`);
await mkdir(res+'/mipmap-anydpi-v26',{recursive:true});
const adaptive = '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/trip_ivory"/><foreground android:drawable="@drawable/trip_crown"/></adaptive-icon>';
for (const name of ['ic_launcher','ic_launcher_round']) {
  await writeFile(res+'/mipmap-anydpi-v26/'+name+'.xml',adaptive);
}
await mkdir(res+'/values',{recursive:true});
await writeFile(res+'/values/trip_colors.xml','<resources><color name="trip_ivory">#FBF7EE</color></resources>');
const stylesPath = res+'/values/styles.xml';
let styles = await readFile(stylesPath,'utf8');
styles = styles.replace(/<item name="android:background">@drawable\/splash<\/item>/g,
  '<item name="windowSplashScreenBackground">@color/trip_ivory</item><item name="windowSplashScreenAnimatedIcon">@drawable/trip_crown</item>');
if (!styles.includes('android:statusBarColor')) {
  styles = styles.replace('<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">',
    '<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar"><item name="android:statusBarColor">@color/trip_ivory</item><item name="android:windowLightStatusBar">true</item>');
}
await writeFile(stylesPath,styles);
if (existsSync('google-services.json')) {
  const config = JSON.parse(await readFile('google-services.json','utf8'));
  if (config.project_info?.project_id !== 'trip-friend-bd675' ||
      !config.client?.some(client => client.client_info?.android_client_info?.package_name === 'com.tripfriend.app')) {
    throw new Error('google-services.json must come from the Trip Friend Android registration');
  }
  await copyFile('google-services.json','android/app/google-services.json');
}
