package com.resonant.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class MessageDTO {
    public UUID id;
    public String content;
    public String author;
    public UUID authorId;
    public UUID channelId;
    public LocalDateTime createdAt;
    public boolean isDeleted;
}
