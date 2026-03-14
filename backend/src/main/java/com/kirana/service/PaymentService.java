package com.kirana.service;

import com.kirana.dto.PaymentDto;
import com.kirana.entity.PurchaseOrder;
import com.kirana.entity.Supplier;
import com.kirana.entity.SupplierPayment;
import com.kirana.exception.NotFoundException;
import com.kirana.exception.ValidationException;
import com.kirana.repository.PurchaseOrderRepository;
import com.kirana.repository.SupplierPaymentRepository;
import com.kirana.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final SupplierPaymentRepository supplierPaymentRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;

    public List<PaymentDto> getSupplierPayments(Long supplierId, Long retailerId) {
        supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(supplierId, retailerId)
                .orElseThrow(() -> new NotFoundException("Supplier not found"));

        return supplierPaymentRepository.findBySupplierIdAndRetailerIdOrderByPaymentDateDesc(supplierId, retailerId).stream()
                .map(p -> PaymentDto.builder()
                        .id(p.getId())
                        .amount(p.getAmount())
                        .date(p.getPaymentDate() != null ? p.getPaymentDate().toString() : null)
                        .method(p.getPaymentMethod())
                        .build())
                .toList();
    }

    @Transactional
    public PaymentDto recordSupplierPayment(PaymentDto dto, Long retailerId) {
        if (dto.getAmount() == null || dto.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Payment amount must be positive");
        }

        supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(dto.getSupplierId(), retailerId)
                .orElseThrow(() -> new NotFoundException("Supplier not found"));

        if (dto.getPurchaseOrderId() != null) {
            PurchaseOrder order = purchaseOrderRepository.findByIdAndRetailerIdAndDeletedAtIsNull(dto.getPurchaseOrderId(), retailerId)
                    .orElseThrow(() -> new NotFoundException("Purchase order not found"));

            if (!order.getSupplierId().equals(dto.getSupplierId())) {
                throw new ValidationException("Purchase order does not belong to the specified supplier");
            }

            BigDecimal pendingAmount = order.getTotalAmount().subtract(order.getPaidAmount());
            if (dto.getAmount().compareTo(pendingAmount) > 0) {
                throw new ValidationException("Payment amount (" + dto.getAmount()
                        + ") exceeds pending amount (" + pendingAmount + ")");
            }
        }

        SupplierPayment payment = SupplierPayment.builder()
                .retailerId(retailerId)
                .supplierId(dto.getSupplierId())
                .purchaseOrderId(dto.getPurchaseOrderId())
                .amount(dto.getAmount())
                .paymentMethod(dto.getMethod())
                .referenceNumber(dto.getReferenceNumber())
                .notes(dto.getNotes())
                .build();
        payment = supplierPaymentRepository.save(payment);

        if (dto.getPurchaseOrderId() != null) {
            PurchaseOrder order = purchaseOrderRepository.findByIdAndRetailerIdAndDeletedAtIsNull(dto.getPurchaseOrderId(), retailerId)
                    .orElse(null);
            if (order != null) {
                order.setPaidAmount(order.getPaidAmount().add(dto.getAmount()));
                if (order.getPaidAmount().compareTo(order.getTotalAmount()) >= 0) {
                    order.setPaymentStatus("paid");
                } else {
                    order.setPaymentStatus("partial");
                }
                purchaseOrderRepository.save(order);
            }
        }

        return PaymentDto.builder()
                .id(payment.getId())
                .amount(payment.getAmount())
                .date(payment.getPaymentDate() != null ? payment.getPaymentDate().toString() : null)
                .method(payment.getPaymentMethod())
                .build();
    }

    public List<Map<String, Object>> getPendingSupplierPayments(Long retailerId) {
        List<PurchaseOrder> orders = purchaseOrderRepository.findByRetailerIdAndDeletedAtIsNullOrderByOrderDateDesc(retailerId);
        return orders.stream()
                .filter(o -> o.getPaidAmount().compareTo(o.getTotalAmount()) < 0)
                .map(o -> {
                    String supplierName = supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(o.getSupplierId(), retailerId)
                            .map(Supplier::getCompanyName).orElse("Unknown");
                    return Map.<String, Object>of(
                            "supplier_id", o.getSupplierId(),
                            "supplier_name", supplierName,
                            "pending_amount", o.getTotalAmount().subtract(o.getPaidAmount()),
                            "order_id", o.getId()
                    );
                })
                .toList();
    }
}
