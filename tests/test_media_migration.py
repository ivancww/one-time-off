import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]

class MediaMigrationTest(unittest.TestCase):
    def test_v3_custom_pages_and_media_validation(self):
        script = r'''
const fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('src/main.js','utf8').replace(/^import .*\n/gm,'');
const bundledData=JSON.parse(fs.readFileSync('data/official-snapshot.json','utf8'));
vm.runInNewContext(source+`
 const v3={introNote:'保留',summaryNote:'結語',titles:Array(7).fill(''),paragraphs:Array(3).fill(''),customPages:[{id:'u-one',title:'自訂',text:'內容',after:2,visible:false}]};
 if(!validV3(v3))throw Error('v3 rejected');
 const v4=migrateUserData(v3);
 if(!validUserData(v4)||v4.customPages[0].media!==''||v4.customPages[0].visible!==false||v4.introNote!=='保留')throw Error('v3 migration lost data');
 v4.customPages[0].media='data:image/png;base64,aGVsbG8=';
 if(!validUserData(v4))throw Error('image rejected');
 if(!validUserData(migrateUserData(v4)))throw Error('v4 migration failed');
 for(const media of ['data:image/svg+xml;base64,PHN2Zz4=','https://evil.test/a.png','data:image/png;base64,abc\" onerror=alert(1)','data:video/mp4;base64,'+'A'.repeat(1400001)]){
  const bad=cloneUser(v4);bad.customPages[0].media=media;if(validUserData(bad))throw Error('unsafe media accepted');
 }
 const injected=cloneUser(v4);injected.customPages[0].official=1;if(validUserData(injected))throw Error('official injection accepted');
 const duplicate=cloneUser(v4);duplicate.customPages.push({...duplicate.customPages[0]});if(validUserData(duplicate))throw Error('duplicate page accepted');
`,{bundledData,document:{},window:{},URLSearchParams});
'''
        subprocess.run(['node','-e',script],cwd=ROOT,check=True)
