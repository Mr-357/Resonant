package com.resonant.service;

import com.resonant.entity.Channel;
import com.resonant.entity.Message;
import com.resonant.entity.User;
import com.resonant.repository.ChannelRepository;
import com.resonant.repository.MessageRepository;
import com.resonant.repository.UserRepository;
import com.resonant.socket.MessageSocket;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ForbiddenException;
import jakarta.ws.rs.NotFoundException;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@ApplicationScoped
public class MessageService {

    @Inject
    MessageRepository messageRepository;

    @Inject
    ChannelRepository channelRepository;

    @Inject
    UserRepository userRepository;

    @Inject
    MessageSocket messageSocket;

    public List<Message> getMessages(Long channelId, Long sinceTimestamp, int limit) {
        if (channelRepository.findByIdOptional(channelId).isEmpty()) {
            throw new NotFoundException("Channel not found");
        }

        if (sinceTimestamp != null && sinceTimestamp > 0) {
            LocalDateTime since = Instant.ofEpochMilli(sinceTimestamp)
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();
            return messageRepository.findByChannelSinceNotDeleted(channelId, since)
                .stream()
                .limit(limit)
                .toList();
        }
        return messageRepository.findByChannelNotDeleted(channelId)
            .stream()
            .limit(limit)
            .toList();
    }

    @Transactional
    public Message create(Long channelId, String content, Long userId) {
        validateContent(content);

        Channel channel = channelRepository.findByIdOptional(channelId)
            .orElseThrow(() -> new NotFoundException("Channel not found"));

        User author = userRepository.findByIdOptional(userId)
            .orElseThrow(() -> new ForbiddenException("User not found"));

        Message message = persistMessage(content, channel, author);
        messageSocket.broadcast(channelId, message);
        return message;
    }

    @Transactional
    public Message create(Long channelId, String content, String username) {
        validateContent(content);

        Channel channel = channelRepository.findByIdOptional(channelId)
            .orElseThrow(() -> new NotFoundException("Channel not found"));

        User author = userRepository.find("username", username).firstResult();
        if (author == null) {
            throw new ForbiddenException("User not found");
        }

        Message message = persistMessage(content, channel, author);
        messageSocket.broadcast(channelId, message);
        return message;
    }

    @Transactional
    public Message update(Long channelId, Long messageId, String content, Long userId) {
        validateContent(content);

        Message message = messageRepository.findByIdOptional(messageId)
            .filter(m -> m.channel.id.equals(channelId))
            .orElseThrow(() -> new NotFoundException("Message not found"));

        if (!message.author.id.equals(userId)) {
            throw new ForbiddenException("Only message author can update it");
        }

        message.content = content;
        messageSocket.broadcast(channelId, message); // Broadcast update
        return message;
    }

    @Transactional
    public void delete(Long channelId, Long messageId, Long userId) {
        Message message = messageRepository.findByIdOptional(messageId)
            .filter(m -> m.channel.id.equals(channelId))
            .orElseThrow(() -> new NotFoundException("Message not found"));

        if (!message.author.id.equals(userId)) {
            throw new ForbiddenException("Only message author can delete it");
        }

        message.isDeleted = true;
        messageRepository.persist(message);
    }

    private Message persistMessage(String content, Channel channel, User author) {
        Message message = new Message();
        message.content = content;
        message.channel = channel;
        message.author = author;
        messageRepository.persist(message);
        return message;
    }

    private void validateContent(String content) {
        if (content == null || content.isBlank()) {
            throw new BadRequestException("Message content is required");
        }
        if (content.length() > 4000) {
            throw new BadRequestException("Message exceeds maximum length");
        }
    }
}