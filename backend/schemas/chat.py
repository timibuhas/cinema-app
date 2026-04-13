from typing import Literal

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    use_database: bool = True


class ChatResponse(BaseModel):
    answer: str
    model: str
    used_database: bool


class ChatMutationRequest(BaseModel):
    instruction: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)
    execute: bool = True


class ChatMutationResponse(BaseModel):
    success: bool
    executed: bool
    action: str
    summary: str
    detail: str | None = None
