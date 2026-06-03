import requests; print(requests.put("http://127.0.0.1:8000/api/users/me/profile", headers={"x-uid": "test"}, json={"display_name": "test", "phone": None}).text)
