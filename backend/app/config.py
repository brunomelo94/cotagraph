from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://cotagraph:localdev_only@postgres:5432/cotagraph"
    database_url_sync: str = "postgresql://cotagraph:localdev_only@postgres:5432/cotagraph"
    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "localdev_only"
    redis_url: str = "redis://redis:6379/0"
    secret_key: str = "dev_secret_key_change_in_production"

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
