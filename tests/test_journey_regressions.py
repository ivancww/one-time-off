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
  state.plan = 'year5'; state.capital = 500000; state.term = 5; state.step = 5;
  const view = body();
  if (!view.includes('513,658.29') || !view.includes('data-year="6"')) throw Error('PDF-sourced annual projection must be available');
  state.step=3; state.term=21; const compare=body(); if(!compare.includes('—') || !compare.includes('銀行')) throw Error('missing year must stay unavailable'); state.step=5;
  state.term = 21; if (!body().includes('—')) throw Error('missing exact year must stay unavailable');
  state.purpose = 'income'; state.bankRate = 1.5; state.bankYears = 10; state.step = 6;
  if (!body().includes('累積已使用') || !body().includes('當時退保價值')) throw Error('withdrawal result roles missing');
  const payout=body();if(!payout.includes('30,000') || !payout.includes('330,000')) throw Error('source-backed annual and cumulative payout incorrect');
  if (!payout.includes('620,189.60')) throw Error('P7 year-15 PDF multiplier balance must be displayed');
  if (!payout.includes('請輸入目前歲數') || !payout.includes('第 15 年')) throw Error('missing current age must offer a P7 input without fake age');
  state.step=3;state.term=15;state.currentAge=40;const ageCompare=body();if(!ageCompare.includes('55歲')||!ageCompare.includes('500,000'))throw Error('age-led same-principal comparison broken');
  state.step=0;if((body().match(/data-method=/g)||[]).length!==4)throw Error('P1 must have four choices');
  state.step=1;if((body().match(/data-purpose=/g)||[]).length!==4)throw Error('P2 must have four choices');
`, {bundledData:data, document: {}, window: {}, URLSearchParams});
'''
        subprocess.run(['node', '-e', script], cwd=ROOT, check=True)


if __name__ == '__main__':
    unittest.main()
