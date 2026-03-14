package com.kirana.service;

import com.kirana.dto.SupplierDto;
import com.kirana.entity.Supplier;
import com.kirana.exception.NotFoundException;
import com.kirana.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository supplierRepository;

    public List<SupplierDto> getSuppliers(Long retailerId) {
        return supplierRepository.findByRetailerIdAndDeletedAtIsNull(retailerId).stream()
                .map(this::toDto)
                .toList();
    }

    public SupplierDto getSupplierById(Long id, Long retailerId) {
        Supplier supplier = supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Supplier not found"));
        return toDto(supplier);
    }

    public SupplierDto addSupplier(SupplierDto dto, Long retailerId) {
        Supplier supplier = Supplier.builder()
                .retailerId(retailerId)
                .companyName(dto.getCompanyName())
                .contactPerson(dto.getContactPerson())
                .phone(dto.getPhone())
                .email(dto.getEmail())
                .address(dto.getAddress())
                .gstNumber(dto.getGstNumber())
                .build();
        return toDto(supplierRepository.save(supplier));
    }

    public SupplierDto updateSupplier(Long id, SupplierDto dto, Long retailerId) {
        Supplier supplier = supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Supplier not found"));
        supplier.setCompanyName(dto.getCompanyName());
        supplier.setContactPerson(dto.getContactPerson());
        supplier.setPhone(dto.getPhone());
        supplier.setEmail(dto.getEmail());
        supplier.setAddress(dto.getAddress());
        supplier.setGstNumber(dto.getGstNumber());
        return toDto(supplierRepository.save(supplier));
    }

    public void deleteSupplier(Long id, Long retailerId) {
        Supplier supplier = supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Supplier not found"));
        supplier.setDeletedAt(LocalDateTime.now());
        supplierRepository.save(supplier);
    }

    private SupplierDto toDto(Supplier s) {
        return SupplierDto.builder()
                .id(s.getId())
                .companyName(s.getCompanyName())
                .contactPerson(s.getContactPerson())
                .phone(s.getPhone())
                .email(s.getEmail())
                .address(s.getAddress())
                .gstNumber(s.getGstNumber())
                .build();
    }
}
