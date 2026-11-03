import pathlib
import subprocess
import unittest

class OfficialAdapterTest(unittest.TestCase):
    def test_adapter_validation_and_fallback(self):
        root = pathlib.Path(__file__).resolve().parents[1]
        subprocess.run(['node', 'tests/test_official_adapter.mjs'], cwd=root, check=True)
