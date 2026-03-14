package com.kirana.service;

import com.kirana.dto.PurchaseOrderDto;
import com.kirana.entity.*;
import com.kirana.exception.NotFoundException;
import com.kirana.exception.ValidationException;
import com.kirana.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PurchaseOrderService {

    private final PurchaseOrderRepository purchaseOrderRepository;
    private final SupplierRepository supplierRepository;
    private final ItemRepository itemRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getPurchaseOrders(Long retailerId) {
        return getPurchaseOrders(retailerId, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPurchaseOrders(Long retailerId, String search, String dateFilter) {
        List<PurchaseOrder> orders = purchaseOrderRepository.findByRetailerIdAndDeletedAtIsNullOrderByOrderDateDesc(retailerId);

        if (dateFilter != null && !"all".equals(dateFilter)) {
            LocalDateTime[] range = resolveDateRange(dateFilter);
            if (range != null) {
                orders = orders.stream().filter(o -> o.getOrderDate() != null
                        && !o.getOrderDate().isBefore(range[0])
                        && !o.getOrderDate().isAfter(range[1])).toList();
            }
        }

        if (search != null && !search.trim().isEmpty()) {
            String lowerSearch = search.trim().toLowerCase();
            orders = orders.stream().filter(o -> {
                String poId = "PO-" + o.getId();
                String supplierName = supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(o.getSupplierId(), retailerId)
                        .map(Supplier::getCompanyName).orElse("");
                return poId.toLowerCase().contains(lowerSearch)
                        || supplierName.toLowerCase().contains(lowerSearch);
            }).toList();
        }

        List<PurchaseOrderDto> dtos = orders.stream().map(o -> toDto(o, retailerId)).toList();

        BigDecimal totalPurchases = orders.stream()
                .map(PurchaseOrder::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pendingPayment = orders.stream()
                .map(o -> o.getTotalAmount().subtract(o.getPaidAmount()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return Map.of(
                "purchase_orders", dtos,
                "summary", Map.of(
                        "total_purchases", totalPurchases,
                        "total_orders", orders.size(),
                        "pending_payment", pendingPayment
                )
        );
    }

    private LocalDateTime[] resolveDateRange(String dateFilter) {
        LocalDate today = LocalDate.now();
        return switch (dateFilter) {
            case "today" -> new LocalDateTime[]{today.atStartOfDay(), today.atTime(LocalTime.MAX)};
            case "week" -> new LocalDateTime[]{today.with(java.time.DayOfWeek.MONDAY).atStartOfDay(), today.atTime(LocalTime.MAX)};
            case "month" -> new LocalDateTime[]{today.with(TemporalAdjusters.firstDayOfMonth()).atStartOfDay(), today.atTime(LocalTime.MAX)};
            case "year" -> new LocalDateTime[]{today.with(TemporalAdjusters.firstDayOfYear()).atStartOfDay(), today.atTime(LocalTime.MAX)};
            default -> null;
        };
    }

    @Transactional(readOnly = true)
    public PurchaseOrderDto getPurchaseOrderById(Long id, Long retailerId) {
        PurchaseOrder order = purchaseOrderRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));
        return toDto(order, retailerId);
    }

    @Transactional
    public PurchaseOrderDto createPurchaseOrder(PurchaseOrderDto dto, Long retailerId) {
        supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(dto.getSupplierId(), retailerId)
                .orElseThrow(() -> new NotFoundException("Supplier not found"));

        if (dto.getTotalAmount() == null || dto.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new ValidationException("Total amount must be positive");
        }

        PurchaseOrder order = PurchaseOrder.builder()
                .retailerId(retailerId)
                .supplierId(dto.getSupplierId())
                .totalAmount(dto.getTotalAmount())
                .notes(dto.getNotes())
                .status("pending")
                .paymentStatus("pending")
                .paidAmount(BigDecimal.ZERO)
                .items(new ArrayList<>())
                .build();

        if (dto.getItems() != null) {
            for (PurchaseOrderDto.PurchaseOrderItemDto itemDto : dto.getItems()) {
                itemRepository.findByIdAndRetailerIdAndDeletedAtIsNull(itemDto.getItemId(), retailerId)
                        .orElseThrow(() -> new NotFoundException("Item not found: " + itemDto.getItemId()));

                if (itemDto.getQuantity() == null || itemDto.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ValidationException("Item quantity must be positive");
                }
                if (itemDto.getUnitPrice() == null || itemDto.getUnitPrice().compareTo(BigDecimal.ZERO) <= 0) {
                    throw new ValidationException("Item unit price must be positive");
                }

                PurchaseOrderItem poi = PurchaseOrderItem.builder()
                        .purchaseOrder(order)
                        .itemId(itemDto.getItemId())
                        .quantity(itemDto.getQuantity())
                        .unitPrice(itemDto.getUnitPrice())
                        .amount(itemDto.getQuantity().multiply(itemDto.getUnitPrice()))
                        .build();
                order.getItems().add(poi);
            }
        }

        return toDto(purchaseOrderRepository.save(order), retailerId);
    }

    @Transactional
    public PurchaseOrderDto updatePurchaseOrderStatus(Long id, String status, Long retailerId) {
        if (status == null || (!status.equals("pending") && !status.equals("received") && !status.equals("cancelled"))) {
            throw new ValidationException("Invalid status. Allowed values: pending, received, cancelled");
        }

        PurchaseOrder order = purchaseOrderRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));

        String currentStatus = order.getStatus();
        if (currentStatus.equals(status)) {
            return toDto(order, retailerId);
        }

        if ("received".equals(currentStatus)) {
            throw new ValidationException("Cannot change status of an already received order");
        }

        if ("cancelled".equals(currentStatus) && !"pending".equals(status)) {
            throw new ValidationException("Cancelled orders can only be moved back to pending");
        }

        order.setStatus(status);

        if ("received".equals(status) && "pending".equals(currentStatus)) {
            for (PurchaseOrderItem poi : order.getItems()) {
                Item item = itemRepository.findByIdAndRetailerIdAndDeletedAtIsNull(poi.getItemId(), retailerId)
                        .orElse(null);
                if (item != null) {
                    item.setCurrentStock(item.getCurrentStock().add(poi.getQuantity()));
                    item.setLastPurchaseDate(LocalDateTime.now());
                    itemRepository.save(item);
                }
            }
        }

        return toDto(purchaseOrderRepository.save(order), retailerId);
    }

    @Transactional(readOnly = true)
    public List<PurchaseOrderDto> getPurchaseOrdersBySupplier(Long supplierId, Long retailerId) {
        supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(supplierId, retailerId)
                .orElseThrow(() -> new NotFoundException("Supplier not found"));

        return purchaseOrderRepository.findByRetailerIdAndSupplierIdAndDeletedAtIsNullOrderByOrderDateDesc(retailerId, supplierId)
                .stream().map(o -> toDto(o, retailerId)).toList();
    }

    public void deletePurchaseOrder(Long id, Long retailerId) {
        PurchaseOrder order = purchaseOrderRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Purchase order not found"));
        order.setDeletedAt(LocalDateTime.now());
        purchaseOrderRepository.save(order);
    }

    private PurchaseOrderDto toDto(PurchaseOrder o, Long retailerId) {
        String supplierName = supplierRepository.findByIdAndRetailerIdAndDeletedAtIsNull(o.getSupplierId(), retailerId)
                .map(Supplier::getCompanyName)
                .orElse("Unknown");

        List<PurchaseOrderDto.PurchaseOrderItemDto> itemDtos = o.getItems().stream().map(poi -> {
            String itemName = itemRepository.findByIdAndRetailerIdAndDeletedAtIsNull(poi.getItemId(), retailerId)
                    .map(Item::getName).orElse("Unknown");
            return PurchaseOrderDto.PurchaseOrderItemDto.builder()
                    .itemId(poi.getItemId())
                    .itemName(itemName)
                    .quantity(poi.getQuantity())
                    .unitPrice(poi.getUnitPrice())
                    .amount(poi.getAmount())
                    .build();
        }).toList();

        return PurchaseOrderDto.builder()
                .id(o.getId())
                .supplierId(o.getSupplierId())
                .supplierName(supplierName)
                .orderDate(o.getOrderDate() != null ? o.getOrderDate().toString() : null)
                .status(o.getStatus())
                .totalAmount(o.getTotalAmount())
                .paymentStatus(o.getPaymentStatus())
                .paidAmount(o.getPaidAmount())
                .pendingAmount(o.getTotalAmount().subtract(o.getPaidAmount()))
                .itemsCount(o.getItems().size())
                .notes(o.getNotes())
                .items(itemDtos)
                .build();
    }
}
