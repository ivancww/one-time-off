import json
import pathlib
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[1]
with (ROOT / "data/official-snapshot.json").open(encoding="utf-8") as f:
    DATA = json.load(f)

class OfficialContractTest(unittest.TestCase):
    def test_four_source_tabs(self):
        self.assertEqual([p["sheet"] for p in DATA["plans"]],
                         ["1year 4%", "3year 5%", "5year 6%", "自動滾存"])

    def test_rates(self):
        self.assertEqual([p["rate"] for p in DATA["plans"]], [0.04, 0.05, 0.06, 0])

    def test_years_unique_ascending_and_multipliers_positive(self):
        for p in DATA["plans"]:
            ys = [y for y, _ in p["balances"]]
            self.assertEqual(ys, sorted(set(ys)))
            self.assertTrue(all(y > 0 and m > 0 for y, m in p["balances"]))

    def test_known_sheet_values(self):
        self.assertAlmostEqual(DATA["plans"][0]["balances"][0][1], 0.79327)
        self.assertAlmostEqual(DATA["plans"][2]["balances"][3][1], 1.552325)
        self.assertAlmostEqual(DATA["plans"][3]["balances"][-1][1], 43.74984)

    def test_rollover_projection(self):
        rollover = dict(DATA["plans"][3]["balances"])
        self.assertEqual(500000 * rollover[20], 1625000)

    def test_missing_year_must_not_be_invented(self):
        year1 = dict(DATA["plans"][0]["balances"])
        self.assertNotIn(6, year1)

    def test_critical_disclosures_and_safe_ui(self):
        js = (ROOT / "src/main.js").read_text(encoding="utf-8")
        self.assertIn("不插值", js)
        self.assertIn("不代表實際銀行報價", js)
        self.assertIn("累計已提取金額未計入", js)
        self.assertIn("window.print()", js)

if __name__ == "__main__":
    unittest.main()
