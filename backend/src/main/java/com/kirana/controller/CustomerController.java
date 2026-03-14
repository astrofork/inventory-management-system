package com.kirana.controller;

import com.kirana.dto.ApiResponse;
import com.kirana.dto.CustomerDto;
import com.kirana.security.TenantContext;
import com.kirana.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCustomers(
            @RequestParam(required = false) String search,
            Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        List<CustomerDto> customers = customerService.getCustomers(retailerId, search);
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "customers", customers,
                "pagination", Map.of("total", customers.size(), "page", 1, "limit", customers.size(), "total_pages", 1)
        )));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getCustomerById(@PathVariable Long id, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("customer", customerService.getCustomerById(id, retailerId))));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Map<String, Object>>> searchCustomer(@RequestParam String phone, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("customers", customerService.searchByPhone(phone, retailerId))));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> addCustomer(@Valid @RequestBody CustomerDto dto, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("customer", customerService.addCustomer(dto, retailerId)), "Customer added"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateCustomer(@PathVariable Long id, @Valid @RequestBody CustomerDto dto, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        return ResponseEntity.ok(ApiResponse.success(Map.of("customer", customerService.updateCustomer(id, dto, retailerId)), "Customer updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable Long id, Authentication auth) {
        Long retailerId = TenantContext.getRetailerId(auth);
        customerService.deleteCustomer(id, retailerId);
        return ResponseEntity.ok(ApiResponse.success(null, "Customer deleted"));
    }
}
