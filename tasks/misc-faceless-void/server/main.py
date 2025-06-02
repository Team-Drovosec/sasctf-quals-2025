from fastapi import FastAPI, File, Depends, UploadFile, Form, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from torchvision import transforms
from PIL import Image
from facenet_pytorch import InceptionResnetV1

import io
import uuid
import os
import numpy as np
import faiss
import jwt
import torch
import torch.nn.functional as F


SECRET_KEY = os.urandom(64)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
EMBEDDING_DIM = 512
SIMILARITY_THRESHOLD = 0.35

app = FastAPI(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

embedder = InceptionResnetV1(pretrained="vggface2").to(device).eval()

class User(BaseModel):
    id: str
    embedding: np.ndarray
    private_notes: List[str] = []
    public_notes: List[str] = []
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
    )
class NoteRequest(BaseModel):
    content: str
    is_private: bool

class UserStore:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.index = faiss.IndexFlatL2(EMBEDDING_DIM)
        self.insertion_order = []

    def add_user(self, embedding: np.ndarray) -> User:
        while True:
            user_id = str(uuid.uuid4())
            if user_id not in self.users:
                break

        embedding = embedding.astype('float32').reshape(1, -1)
        self.index.add(embedding)
        self.insertion_order.append(user_id)

        user = User(
            id=user_id,
            embedding=embedding.flatten(),
            private_notes=[],
            public_notes=[]
        )
        self.users[user_id] = user
        return user

    def get_users(self, source_user: User) -> List[dict]:
        query_embedding = source_user.embedding.astype('float32').reshape(1, -1)
        _, indices = self.index.search(query_embedding, self.index.ntotal)
        return list(map(lambda x: self.insertion_order[x], indices[0]))

    def find_user_by_face(self, embedding: np.ndarray) -> Optional[User]:
        embedding = embedding.astype('float32').reshape(1, -1)
        distances, indices = self.index.search(embedding, 1)
        print(indices[0][0], distances[0][0])
        if indices[0][0] == -1 or distances[0][0] > SIMILARITY_THRESHOLD:
            return None
        user_ids = list(self.users.keys())
        user_id = user_ids[indices[0][0]]
        return self.users.get(user_id)
    
    def get_user(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)
    
    def add_note(self, user_id: str, content: str, is_private: bool) -> bool:
        user = self.users.get(user_id)
        if not user:
            return False
            
        if is_private:
            user.private_notes.append(content)
        else:
            user.public_notes.append(content)
            
        return True

user_store = UserStore()

def create_access_token(user_id: str):
    expires = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "exp": expires
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload["sub"]
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

def get_face_embedding(image: Image.Image) -> np.ndarray:
    preprocess = transforms.Compose([
        transforms.Resize((160, 160)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.5,0.5,0.5],
                             std=[0.5,0.5,0.5]),
    ])

    img_t = preprocess(image).unsqueeze(0).to(device)
    with torch.no_grad():
        emb = embedder(img_t)
        emb = F.normalize(emb, p=2, dim=1)
    return emb.squeeze(0).cpu().numpy()


@app.post("/auth")
async def authenticate_or_register_user(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    try:
        embedding = get_face_embedding(image)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

    user = user_store.find_user_by_face(embedding)
    is_new_user = False

    if not user:
        user = user_store.add_user(embedding)
        is_new_user = True

    access_token = create_access_token(user.id)
    return {
        "user_id": user.id,
        "access_token": access_token,
        "token_type": "bearer",
        "is_new_user": is_new_user
    }

@app.post("/notes")
async def add_note(note_req: NoteRequest, user_id: str = Depends(verify_token)):
    success = user_store.add_note(user_id, note_req.content, note_req.is_private)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Note added successfully"}


@app.get("/notes")
async def get_user_notes(current_user_id: str = Depends(verify_token)):
    current_user = user_store.get_user(current_user_id)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    return {
        "private_notes": current_user.private_notes,
        "public_notes": current_user.public_notes
    }

@app.get("/notes/{user_id}")
async def get_user_notes(user_id: str, current_user_id: str = Depends(verify_token)):
    current_user = user_store.get_user(current_user_id)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    user = user_store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"public_notes": user.public_notes, "private_notes": len(user.private_notes)}

@app.get("/users")
async def get_users(current_user_id: str = Depends(verify_token)):
    current_user = user_store.get_user(current_user_id)
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )
    users = user_store.get_users(current_user)
    return {"users": users}