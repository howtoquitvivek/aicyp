from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openweather_api_key: str = ""
    mongodb_url: str = ""
    groq_api_key: str = ""
    datagov_api_key: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


@lru_cache()
def get_settings():
    return Settings()
