from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class InvoiceItem(BaseModel):
    art_name: str = Field(..., min_length=1, max_length=100)
    product_type: str = Field(..., min_length=1, max_length=100)
    size: str = Field(..., min_length=1, max_length=30)
    quantity: int = Field(..., ge=1, le=999)


class InvoiceRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=30)
    company: Optional[str] = Field(None, max_length=200)
    notes: Optional[str] = Field(None, max_length=2000)
    items: list[InvoiceItem] = Field(..., min_length=1, max_length=50)


class InvoiceItemOut(BaseModel):
    art_name: str
    product_type: str
    size: str
    quantity: int


class InvoiceRequestOut(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str]
    company: Optional[str]
    notes: Optional[str]
    items: list[InvoiceItemOut]
    status: str
    admin_notes: Optional[str]
    created_at: str
    updated_at: str


class StatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(pending|reviewed|fulfilled|archived)$")
    admin_notes: Optional[str] = Field(None, max_length=2000)


class LoginRequest(BaseModel):
    password: str
