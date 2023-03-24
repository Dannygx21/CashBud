import databases
import ormar
import sqlalchemy

from .config import settings

database = databases.Database(settings.db_url)
metadata = sqlalchemy.MetaData()


class BaseMeta(ormar.ModelMeta):
    metadata = metadata
    database = database


class User(ormar.Model):
    class Meta(BaseMeta):
        tablename = "users"

    id: int = ormar.Integer(primary_key=True)
    first_name: str = ormar.String(max_length=100) 
    last_name: str = ormar.String(max_length=100) 

engine = sqlalchemy.create_engine(settings.db_url)
metadata.create_all(engine)
    
