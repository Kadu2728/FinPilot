from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import date, datetime
from typing import Optional
from .database import Base


# ── ORM Models ────────────────────────────────────────────
class Usuario(Base):
    __tablename__ = "usuarios"
    id           = Column(Integer, primary_key=True, index=True)
    nome         = Column(String(100))
    email        = Column(String(150), unique=True, index=True)
    senha_hash   = Column(String(255))
    data_criacao = Column(DateTime, server_default=func.now())

class Receita(Base):
    __tablename__ = "receitas"
    id           = Column(Integer, primary_key=True, index=True)
    usuario_id   = Column(Integer, ForeignKey("usuarios.id"))
    descricao    = Column(String(255))
    valor        = Column(Numeric(10, 2))
    categoria    = Column(String(50))
    data_receita = Column(Date)

class Despesa(Base):
    __tablename__ = "despesas"
    id           = Column(Integer, primary_key=True, index=True)
    usuario_id   = Column(Integer, ForeignKey("usuarios.id"))
    descricao    = Column(String(255))
    valor        = Column(Numeric(10, 2))
    categoria    = Column(String(50))
    data_despesa = Column(Date)

class Meta(Base):
    __tablename__ = "metas"
    id          = Column(Integer, primary_key=True, index=True)
    usuario_id  = Column(Integer, ForeignKey("usuarios.id"))
    meta_mensal = Column(Numeric(10, 2))
    valor_atual = Column(Numeric(10, 2), default=0)


# ── Pydantic Schemas (v2) ─────────────────────────────────
class UserCreate(BaseModel):
    nome:  str
    email: EmailStr
    senha: str

class UserLogin(BaseModel):
    email: EmailStr
    senha: str

class UserUpdate(BaseModel):
    nome: str

class PasswordChange(BaseModel):
    senha_atual: str
    senha_nova:  str

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:    int
    nome:  str
    email: EmailStr

class ReceitaCreate(BaseModel):
    descricao:    str
    valor:        float
    categoria:    str
    data_receita: date

class ReceitaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:           int
    descricao:    str
    valor:        float
    categoria:    str
    data_receita: date

class DespesaCreate(BaseModel):
    descricao:    str
    valor:        float
    categoria:    str
    data_despesa: date

class DespesaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:           int
    descricao:    str
    valor:        float
    categoria:    str
    data_despesa: date

class MetaCreate(BaseModel):
    meta_mensal: float
    valor_atual: float = 0

class MetaUpdate(BaseModel):
    meta_mensal: float

class MetaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id:          int
    meta_mensal: float
    valor_atual: float

class Token(BaseModel):
    access_token: str
    token_type:   str