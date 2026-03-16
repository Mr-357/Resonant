package com.resonant.dto;

public class CreateServerRequest {
    public String name;
    public String description;

    public CreateServerRequest() {}

    public CreateServerRequest(String name, String description) {
        this.name = name;
        this.description = description;
    }
}
