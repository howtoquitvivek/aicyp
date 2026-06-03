import requests

try:
    res = requests.put("http://127.0.0.1:8000/api/users/me/profile", headers={"x-uid": "test"}, json={"display_name": "test"})
    print("Status:", res.status_code)
    print("Response:", res.text)
except Exception as e:
    print(e)
