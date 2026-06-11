from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from .database import get_db
from . import models, auth
from sqlalchemy import func

router = APIRouter()

@router.post("/register", response_model=models.Token)
@router.post("/auth/register", response_model=models.Token)
def register(user: models.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.Usuario).filter(models.Usuario.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    hashed_password = auth.get_password_hash(user.senha)
    new_user = models.Usuario(nome=user.nome, email=user.email, senha_hash=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=models.Token)
@router.post("/auth/login", response_model=models.Token)
def login(credentials: models.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.Usuario).filter(models.Usuario.email == credentials.email).first()
    if not user or not auth.verify_password(credentials.password, user.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email ou senha incorretos")

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/auth/me", response_model=models.UserResponse)
def get_profile(current_user: models.Usuario = Depends(auth.get_current_user)):
    return current_user

@router.put("/auth/me", response_model=models.UserResponse)
def update_profile(user_update: models.UserUpdate, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    current_user.nome = user_update.nome
    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/auth/password")
def change_password(payload: models.PasswordChange, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    if not auth.verify_password(payload.senha_atual, current_user.senha_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta")

    current_user.senha_hash = auth.get_password_hash(payload.senha_nova)
    db.commit()
    return {"detail": "Senha alterada com sucesso"}

@router.get("/dashboard")
@router.get("/dashboard/summary")
def get_summary(current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    total_receitas = db.query(func.sum(models.Receita.valor)).filter(models.Receita.usuario_id == current_user.id).scalar() or 0
    total_despesas = db.query(func.sum(models.Despesa.valor)).filter(models.Despesa.usuario_id == current_user.id).scalar() or 0
    saldo = total_receitas - total_despesas
    
    return {
        "receitas": float(total_receitas),
        "despesas": float(total_despesas),
        "saldo": float(saldo)
    }

@router.get("/receitas", response_model=list[models.ReceitaResponse])
def get_receitas(mes: str = None, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    query = db.query(models.Receita).filter(models.Receita.usuario_id == current_user.id)
    if mes:
        query = query.filter(func.strftime('%Y-%m', models.Receita.data_receita) == mes)
    return query.order_by(models.Receita.data_receita.desc()).all()

@router.post("/receitas", response_model=models.ReceitaResponse)
def create_receita(receita: models.ReceitaCreate, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    new_receita = models.Receita(usuario_id=current_user.id, **receita.dict())
    db.add(new_receita)
    db.commit()
    db.refresh(new_receita)
    return new_receita

@router.put("/receitas/{id}", response_model=models.ReceitaResponse)
def update_receita(id: int, receita: models.ReceitaCreate, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    rec = db.query(models.Receita).filter(models.Receita.id == id, models.Receita.usuario_id == current_user.id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receita não encontrada")
    for field, value in receita.dict().items():
        setattr(rec, field, value)
    db.commit()
    db.refresh(rec)
    return rec

@router.delete("/receitas/{id}")
def delete_receita(id: int, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    rec = db.query(models.Receita).filter(models.Receita.id == id, models.Receita.usuario_id == current_user.id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receita não encontrada")
    db.delete(rec)
    db.commit()
    return {"detail": "Receita excluída"}

@router.get("/despesas", response_model=list[models.DespesaResponse])
def get_despesas(mes: str = None, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    query = db.query(models.Despesa).filter(models.Despesa.usuario_id == current_user.id)
    if mes:
        query = query.filter(func.strftime('%Y-%m', models.Despesa.data_despesa) == mes)
    return query.order_by(models.Despesa.data_despesa.desc()).all()

@router.post("/despesas", response_model=models.DespesaResponse)
def create_despesa(despesa: models.DespesaCreate, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    new_despesa = models.Despesa(usuario_id=current_user.id, **despesa.dict())
    db.add(new_despesa)
    db.commit()
    db.refresh(new_despesa)
    return new_despesa

@router.put("/despesas/{id}", response_model=models.DespesaResponse)
def update_despesa(id: int, despesa: models.DespesaCreate, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.Despesa).filter(models.Despesa.id == id, models.Despesa.usuario_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Despesa não encontrada")
    for field, value in despesa.dict().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/despesas/{id}")
def delete_despesa(id: int, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.Despesa).filter(models.Despesa.id == id, models.Despesa.usuario_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Despesa não encontrada")
    db.delete(item)
    db.commit()
    return {"detail": "Despesa excluída"}

@router.get("/metas", response_model=list[models.MetaResponse])
def get_metas(current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Meta).filter(models.Meta.usuario_id == current_user.id).all()

@router.post("/metas", response_model=models.MetaResponse)
def create_meta(meta: models.MetaCreate, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    new_meta = models.Meta(usuario_id=current_user.id, **meta.dict())
    db.add(new_meta)
    db.commit()
    db.refresh(new_meta)
    return new_meta

@router.put("/metas/{id}", response_model=models.MetaResponse)
def update_meta(id: int, meta: models.MetaUpdate, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.Meta).filter(models.Meta.id == id, models.Meta.usuario_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta não encontrada")
    item.meta_mensal = meta.meta_mensal
    db.commit()
    db.refresh(item)
    return item

@router.delete("/metas/{id}")
def delete_meta(id: int, current_user: models.Usuario = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    item = db.query(models.Meta).filter(models.Meta.id == id, models.Meta.usuario_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meta não encontrada")
    db.delete(item)
    db.commit()
    return {"detail": "Meta excluída"}
