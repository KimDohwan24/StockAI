package com.stock.controller.dto;

import org.springframework.data.domain.Page;

import java.util.List;

public record CatalogPageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {

    public static <T> CatalogPageResponse<T> from(Page<T> page) {
        return new CatalogPageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }
}