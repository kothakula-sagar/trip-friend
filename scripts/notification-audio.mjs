import {mkdir,readFile,writeFile} from 'node:fs/promises';

const tones = JSON.parse(await readFile('notification-tones.json','utf8'));
const folders = process.argv.slice(2);
for (const folder of folders) await mkdir(folder,{recursive:true});
for (const {id,notes} of tones) {
  const rate = 16000;
  const length = Math.round(rate*.19);
  const samples = length*notes.length;
  const wave = Buffer.alloc(44+samples*2);
  wave.write('RIFF'); wave.writeUInt32LE(wave.length-8,4); wave.write('WAVEfmt ',8);
  wave.writeUInt32LE(16,16); wave.writeUInt16LE(1,20); wave.writeUInt16LE(1,22);
  wave.writeUInt32LE(rate,24); wave.writeUInt32LE(rate*2,28); wave.writeUInt16LE(2,32); wave.writeUInt16LE(16,34);
  wave.write('data',36); wave.writeUInt32LE(samples*2,40);
  notes.forEach((note,index) => {
    for (let i=0;i<length;i++) {
      const envelope = Math.min(1,i/180,(length-1-i)/1500);
      wave.writeInt16LE(Math.round(Math.sin(2*Math.PI*note*i/rate)*6500*envelope),44+(index*length+i)*2);
    }
  });
  for (const folder of folders) await writeFile(folder+'/'+id+'.wav',wave);
}
