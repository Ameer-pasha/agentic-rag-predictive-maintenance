"""Fast API checks that do not require an Ollama inference call."""

import unittest

from fastapi.testclient import TestClient

from app import app


class ManufacturingApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health(self) -> None:
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_machine_catalog(self) -> None:
        response = self.client.get("/machines")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["machines"]), 20)

    def test_machine_history(self) -> None:
        response = self.client.get("/machines/M12/history")

        self.assertEqual(response.status_code, 200)
        self.assertGreater(len(response.json()["entries"]), 0)


if __name__ == "__main__":
    unittest.main()
