import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
with (ROOT / "data/official-snapshot.json").open(encoding="utf-8") as f:
    DATA = json.load(f)

class OfficialContractTest(unittest.TestCase):
    def test_five_source_tabs_and_rates(self):
        self.assertEqual(
            [(p["id"],p["sheet"],p["rate"],p["startYear"]) for p in DATA["plans"]],
            [("year5","5year 6%",0.06,5),("year7","7year 6.5%",0.065,7),
             ("year9","9year 7%",0.07,9),("year11","11year 8%",0.08,11),
             ("rollover","自動滾存",0,None)])

    def test_exact_year_sequence(self):
        expected=list(range(1,21))+list(range(25,101,5))
        for p in DATA["plans"][:4]:
            self.assertEqual([y for y,_ in p["balances"]],expected)
            self.assertTrue(all(m>0 for _,m in p["balances"]))
        self.assertEqual(len(DATA["plans"][-1]["balances"]),24)
        for p in DATA["plans"]:
            years=[y for y,_ in p["balances"]]
            self.assertEqual(years,sorted(set(years)))

    def test_four_pdf_source_surrender_values(self):
        for p,pdf_year,pdf_total in zip(DATA["plans"][:4],[5,7,9,11],[308196,363551,420464,481186]):
            self.assertAlmostEqual(dict(p["balances"])[pdf_year]*300001,pdf_total,places=3)
        self.assertEqual(dict(DATA["plans"][-1]["balances"])[20],3.25)

    def test_critical_disclosures_and_safe_ui(self):
        js=(ROOT/"src/main.js").read_text(encoding="utf-8")
        self.assertIn("不插值",str(DATA["content"]["disclosures"]))
        self.assertIn("不代表實際銀行報價",str(DATA["content"]["disclosures"]))
        self.assertIn("累積已提取金額",str(DATA["content"]["disclosures"]).replace("累積已使用","累積已提取金額"))
        self.assertIn("window.print()",js)

if __name__ == "__main__":
    unittest.main()
