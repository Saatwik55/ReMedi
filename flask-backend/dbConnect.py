from pymongo import MongoClient as mc
from dotenv import load_dotenv
import os
load_dotenv()
dbURI = os.environ.get("DB_URI")
client = mc(dbURI)
db = client['remedi']
users_collection = db['users']