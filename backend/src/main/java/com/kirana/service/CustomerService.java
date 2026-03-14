package com.kirana.service;

import com.kirana.dto.CustomerDto;
import com.kirana.entity.Customer;
import com.kirana.exception.NotFoundException;
import com.kirana.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    public List<CustomerDto> getCustomers(Long retailerId) {
        return getCustomers(retailerId, null);
    }

    public List<CustomerDto> getCustomers(Long retailerId, String search) {
        List<Customer> customers;
        if (search != null && !search.trim().isEmpty()) {
            customers = customerRepository.searchCustomers(retailerId, search.trim());
        } else {
            customers = customerRepository.findByRetailerIdAndDeletedAtIsNull(retailerId);
        }
        return customers.stream().map(this::toDto).toList();
    }

    public CustomerDto getCustomerById(Long id, Long retailerId) {
        Customer customer = customerRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Customer not found"));
        return toDto(customer);
    }

    public List<CustomerDto> searchByPhone(String phone, Long retailerId) {
        return customerRepository.findByRetailerIdAndDeletedAtIsNull(retailerId).stream()
                .filter(c -> c.getPhoneNumber().contains(phone))
                .map(this::toDto)
                .toList();
    }

    public CustomerDto addCustomer(CustomerDto dto, Long retailerId) {
        Customer customer = Customer.builder()
                .retailerId(retailerId)
                .name(dto.getName())
                .phoneNumber(dto.getPhoneNumber())
                .email(dto.getEmail())
                .address(dto.getAddress())
                .build();
        return toDto(customerRepository.save(customer));
    }

    public CustomerDto updateCustomer(Long id, CustomerDto dto, Long retailerId) {
        Customer customer = customerRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Customer not found"));
        customer.setName(dto.getName());
        customer.setPhoneNumber(dto.getPhoneNumber());
        customer.setEmail(dto.getEmail());
        customer.setAddress(dto.getAddress());
        return toDto(customerRepository.save(customer));
    }

    public void deleteCustomer(Long id, Long retailerId) {
        Customer customer = customerRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Customer not found"));
        customer.setDeletedAt(LocalDateTime.now());
        customerRepository.save(customer);
    }

    private CustomerDto toDto(Customer c) {
        return CustomerDto.builder()
                .id(c.getId())
                .name(c.getName())
                .phoneNumber(c.getPhoneNumber())
                .email(c.getEmail())
                .address(c.getAddress())
                .totalPurchases(c.getTotalPurchases())
                .build();
    }
}
