from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "PMP_Service"
    database_url: str = "sqlite+aiosqlite:///./pmp_dev.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    storage_root: str = "./data/storage"

    @property
    def cors_origins_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


settings = Settings()
