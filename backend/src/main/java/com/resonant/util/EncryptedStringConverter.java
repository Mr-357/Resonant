package com.resonant.util;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import com.resonant.security.EncryptionService;

import jakarta.inject.Inject;

@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    @Inject
    EncryptionService encryptionService;

    @Override
    public String convertToDatabaseColumn(String attribute) {
        return encryptionService.encrypt(attribute);
    }

    @Override
    public String convertToEntityAttribute(String dbData) {
        return encryptionService.decrypt(dbData);
    }
}