from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pydantic import BaseModel, EmailStr, Field
from .database import Base
from datetime import date, datetime

# --- ORM Models ---
class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100))
    email = Column(String(150), unique=True, index=True)
    senha_hash = Column(String(255))
    data_criacao = Column(DateTime, server_default=func.now())

class Receita(Base):
    __tablename__ = "receitas"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    descricao = Column(String(255))
    valor = Column(Numeric(10, 2))
    categoria = Column(String(50))
    data_receita = Column(Date)

class Despesa(Base):
    __tablename__ = "despesas"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    descricao = Column(String(255))
    valor = Column(Numeric(10, 2))
    categoria = Column(String(50))
    data_despesa = Column(Date)

class Meta(Base):
    __tablename__ = "metas"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    meta_mensal = Column(Numeric(10, 2))
    valor_atual = Column(Numeric(10, 2), default=0)

# --- Pydantic Schemas ---
class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str = Field(..., alias='password')

    class Config:
        allow_population_by_field_name = True

class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., alias='senha')

    class Config:
        allow_population_by_field_name = True

class UserUpdate(BaseModel):
    nome: str

class PasswordChange(BaseModel):
    senha_atual: str
    senha_nova: str

class UserResponse(BaseModel):
    id: int
    nome: str
    email: EmailStr

    class Config:
        orm_mode = True

class ReceitaCreate(BaseModel):
    descricao: str
    valor: float
    categoria: str
    data_receita: date

class ReceitaResponse(BaseModel):
    id: int
    descricao: str
    valor: float
    categoria: str
    data_receita: date

    class Config:
        orm_mode = True

class DespesaCreate(BaseModel):
    descricao: str
    valor: float
    categoria: str
    data_despesa: date

class DespesaResponse(BaseModel):
    id: int
    descricao: str
    valor: float
    categoria: str
    data_despesa: date

    class Config:
        orm_mode = True

class MetaCreate(BaseModel):
    meta_mensal: float
    valor_atual: float = 0

class MetaUpdate(BaseModel):
    meta_mensal: float

class MetaResponse(BaseModel):
    id: int
    meta_mensal: float
    valor_atual: float

    class Config:
        orm_mode = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TransactionCreate(BaseModel):
    descricao: str
    valor: float
    categoria: str
    data_transacao: date