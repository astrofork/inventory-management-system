package com.kirana.controller;

import com.kirana.dto.ApiResponse;
import com.kirana.dto.ItemDto;
import com.kirana.dto.StockAdjustmentRequest;
import com.kirana.security.TenantContext;
import com.kirana.service.ItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/items")
@RequiredArgsConstructor
public class ItemController {

    private final ItemService itemService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getItems(Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        List<ItemDto> items = itemService.getItems(retailerId);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "items", items,
                "pagination", Map.of("total", items.size(), "page", 1, "limit", items.size(), "total_pages", 1)
        )));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getItemById(@PathVariable Long id, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("item", itemService.getItemById(id, retailerId))));
    }

    @GetMapping("/inventory")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getItemsInventory(Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(itemService.getItemsInventory(retailerId)));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getAvailableItems(
            @RequestParam(required = false) String search,
            Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("items", itemService.getAvailableItems(retailerId, search))));
    }

    @GetMapping("/low-stock")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getLowStockItems(Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("items", itemService.getLowStockItems(retailerId))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> addItem(@Valid @RequestBody ItemDto dto, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("item", itemService.addItem(dto, retailerId)), "Item added successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateItem(@PathVariable Long id, @Valid @RequestBody ItemDto dto, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("item", itemService.updateItem(id, dto, retailerId)), "Item updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteItem(@PathVariable Long id, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        itemService.deleteItem(id, retailerId);
        return ResponseEntity.ok(ApiResponse.success(null, "Item deleted successfully"));
    }

    @PostMapping("/{id}/adjust-stock")
    public ResponseEntity<ApiResponse<Map<String, Object>>> adjustStock(@PathVariable Long id, @Valid @RequestBody StockAdjustmentRequest request, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("item", itemService.adjustStock(id, request, retailerId)), "Stock adjusted successfully"));
    }

    @GetMapping("/{id}/transactions")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getItemTransactions(@PathVariable Long id, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("transactions", itemService.getItemTransactions(id, retailerId))));
    }
}
