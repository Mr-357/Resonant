package com.resonant.dto;

public class CreateChannelRequest {
    public String name;
    public String description;

    public CreateChannelRequest() {}

    public CreateChannelRequest(String name, String description) {
        this.name = name;
        this.description = description;
    }
}
