import pathlib
import subprocess
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]


class JourneyRegressionTest(unittest.TestCase):
    def test_projection_uses_only_available_years_and_summary_retains_goals(self):
        script = r'''
const fs = require('fs'), vm = require('vm');
const data = JSON.parse(fs.readFileSync('data/official-snapshot.json', 'utf8'));
const source = fs.readFileSync('src/main.js', 'utf8')
  .replace(/^import .*\n/gm, '').replace(/\nrender\(\);\s*$/, '');
vm.runInNewContext(source + `
  if (entryMode('?avaEntry=frontend') !== 'frontend' || entryMode('?avaEntry=admin') !== 'admin' || entryMode('?avaEntry=user') !== 'user' || entryMode('?avaEntry=frontend&avaEntry=admin') !== 'admin') throw Error('unsafe entry routing');
  if (!validLegacyUserData({introNote:'one',summaryNote:'two'})) throw Error('legacy notes rejected');
  const migrated=migrateUserData({introNote:'one',summaryNote:'two'});
  if (!validUserData(migrated) || migrated.introNote!=='one' || migrated.titles.length!==7) throw Error('legacy migration failed');
  if (validUserData({...migrated,official:1}) || validUserData({...migrated,titles:['x']})) throw Error('invalid v2 accepted');
  if (validUserData({introNote:'one',summaryNote:'two',official:1}) || validUserData({introNote:'x'.repeat(2001),summaryNote:''})) throw Error('unsafe note accepted');
  if (escapeText('<img onerror=alert(1)>').includes('<')) throw Error('markup not escaped');
  if (!validateSnapshot(data)) throw Error('valid snapshot rejected');
  const broken = JSON.parse(JSON.stringify(data)); broken.plans[0].balances[0][1] = -1;
  if (validateSnapshot(broken)) throw Error('invalid multiplier accepted');
  broken.plans[0].balances[0][1] = 1; broken.plans[0].balances[1][0] = broken.plans[0].balances[0][0];
  if (validateSnapshot(broken)) throw Error('duplicate year accepted');
  state.plan = 'year1'; state.capital = 500000; state.term = 5; state.step = 5;
  const view = body();
  if (!view.includes('396,635') || view.includes('data-year="6"')) throw Error('incorrect exact-year projection');
  state.step=3; state.term=6; const compare=body(); if(!compare.includes('官方無提供呢個年度') || !compare.includes('銀行')) throw Error('exact-year comparison incorrect'); state.step=5;
  state.term = 6; if (!body().includes('呢個時間點官方未有提供數值')) throw Error('missing year must stay unavailable');
  state.purpose = 'income'; state.bankRate = 1.5; state.bankYears = 10; state.step = 6;
  if (!body().includes('收息／現金流')) throw Error('purpose missing from withdrawal view');
  if (!body().includes('累積已使用') || !body().includes('當時戶口價值')) throw Error('withdrawal result roles missing');
  if (!body().includes('唔會用 5PAY')) throw Error('unsupported withdrawal calculations must be clearly denied');
  state.step=3;state.term=15;state.currentAge=40;const ageCompare=body();if(!ageCompare.includes('55歲')||!ageCompare.includes('500,000'))throw Error('age-led same-principal comparison broken');
  state.step=0;if((body().match(/data-method=/g)||[]).length!==4)throw Error('P1 must have four choices');
  state.step=1;if((body().match(/data-purpose=/g)||[]).length!==4)throw Error('P2 must have four choices');
`, {bundledData:data, document: {}, window: {}, URLSearchParams});
'''
        subprocess.run(['node', '-e', script], cwd=ROOT, check=True)


if __name__ == '__main__':
    unittest.main()
