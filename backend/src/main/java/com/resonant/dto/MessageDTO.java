package com.resonant.dto;

import java.time.LocalDateTime;

public class MessageDTO {
    public Long id;
    public String content;
    public String author;
    public Long authorId;
    public Long channelId;
    public LocalDateTime createdAt;
    public boolean isDeleted;
}
