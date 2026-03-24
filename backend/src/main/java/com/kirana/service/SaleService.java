package com.kirana.service;

import com.kirana.dto.SaleDto;
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
public class SaleService {

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final ItemRepository itemRepository;
    private final CustomerRepository customerRepository;

    @Transactional(readOnly = true)
    public Map<String, Object> getSales(Long retailerId) {
        return getSales(retailerId, null, null);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSales(Long retailerId, String search, String dateFilter) {
        List<Sale> sales;
        LocalDateTime[] range = resolveDateRange(dateFilter);
        if (range != null) {
            sales = saleRepository.findByRetailerIdAndDeletedAtIsNullAndSaleDateBetweenOrderBySaleDateDesc(retailerId, range[0], range[1]);
        } else {
            sales = saleRepository.findByRetailerIdAndDeletedAtIsNullOrderBySaleDateDesc(retailerId);
        }

        if (search != null && !search.trim().isEmpty()) {
            String lowerSearch = search.trim().toLowerCase();
            sales = sales.stream().filter(s -> {
                String billNum = "BILL-" + s.getId();
                String custName = s.getCustomerId() != null
                        ? customerRepository.findByIdAndRetailerIdAndDeletedAtIsNull(s.getCustomerId(), retailerId)
                            .map(Customer::getName).orElse("")
                        : "";
                return billNum.toLowerCase().contains(lowerSearch)
                        || custName.toLowerCase().contains(lowerSearch);
            }).toList();
        }

        List<SaleDto> dtos = sales.stream().map(s -> toDto(s, retailerId)).toList();

        BigDecimal totalSales = sales.stream().map(Sale::getFinalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalProfit = BigDecimal.ZERO;
        for (Sale sale : sales) {
            for (SaleItem si : sale.getItems()) {
                totalProfit = totalProfit.add(si.getProfit());
            }
        }

        return Map.of(
                "sales", dtos,
                "summary", Map.of(
                        "total_sales", totalSales,
                        "total_bills", sales.size(),
                        "total_profit", totalProfit,
                        "cash_sales", BigDecimal.ZERO,
                        "card_sales", BigDecimal.ZERO,
                        "upi_sales", BigDecimal.ZERO,
                        "pending_amount", BigDecimal.ZERO
                )
        );
    }

    private LocalDateTime[] resolveDateRange(String dateFilter) {
        if (dateFilter == null || "all".equals(dateFilter)) return null;
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
    public SaleDto getSaleById(Long id, Long retailerId) {
        Sale sale = saleRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Sale not found"));
        return toDto(sale, retailerId);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSaleDetails(Long id, Long retailerId) {
        Sale sale = saleRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Sale not found"));
        SaleDto dto = toDto(sale, retailerId);

        List<Map<String, Object>> items = sale.getItems().stream().map(si -> {
            String itemName = itemRepository.findByIdAndRetailerIdAndDeletedAtIsNull(si.getItemId(), retailerId)
                    .map(Item::getName).orElse("Unknown");
            return Map.<String, Object>of(
                    "item_name", itemName,
                    "quantity", si.getQuantity(),
                    "unit_price", si.getUnitSellingPrice(),
                    "total", si.getAmount()
            );
        }).toList();

        return Map.of("sale", dto, "items", items);
    }

    @Transactional
    public SaleDto createSale(SaleDto dto, Long retailerId) {
        if (dto.getItems() == null || dto.getItems().isEmpty()) {
            throw new ValidationException("Sale must contain at least one item");
        }
        if (dto.getFinalAmount() == null || dto.getFinalAmount().compareTo(BigDecimal.ZERO) < 0) {
            throw new ValidationException("Final amount must be non-negative");
        }

        Sale sale = Sale.builder()
                .retailerId(retailerId)
                .customerId(dto.getCustomerId())
                .totalAmount(dto.getTotalAmount())
                .discount(dto.getDiscount() != null ? dto.getDiscount() : BigDecimal.ZERO)
                .finalAmount(dto.getFinalAmount())
                .paymentMethod(dto.getPaymentMethod())
                .paymentStatus(dto.getPaymentStatus() != null ? dto.getPaymentStatus() : "paid")
                .paidAmount(dto.getPaidAmount() != null ? dto.getPaidAmount() : dto.getFinalAmount())
                .notes(dto.getNotes())
                .items(new ArrayList<>())
                .build();

        for (SaleDto.SaleItemDto itemDto : dto.getItems()) {
            Item item = itemRepository.findByIdAndRetailerIdAndDeletedAtIsNull(itemDto.getItemId(), retailerId)
                    .orElseThrow(() -> new NotFoundException("Item not found: " + itemDto.getItemId()));

            if (item.getCurrentStock().compareTo(itemDto.getQuantity()) < 0) {
                throw new ValidationException("Insufficient stock for " + item.getName()
                        + ". Available: " + item.getCurrentStock() + ", requested: " + itemDto.getQuantity());
            }

            BigDecimal costPrice = item.getPurchasePrice();
            BigDecimal amount = itemDto.getQuantity().multiply(itemDto.getUnitPrice());
            BigDecimal profit = amount.subtract(itemDto.getQuantity().multiply(costPrice));

            SaleItem saleItem = SaleItem.builder()
                    .sale(sale)
                    .itemId(itemDto.getItemId())
                    .quantity(itemDto.getQuantity())
                    .unitSellingPrice(itemDto.getUnitPrice())
                    .unitCostPrice(costPrice)
                    .amount(amount)
                    .profit(profit)
                    .build();
            sale.getItems().add(saleItem);

            item.setCurrentStock(item.getCurrentStock().subtract(itemDto.getQuantity()));
            item.setLastSaleDate(LocalDateTime.now());
            itemRepository.save(item);
        }

        return toDto(saleRepository.save(sale), retailerId);
    }

    public void deleteSale(Long id, Long retailerId) {
        Sale sale = saleRepository.findByIdAndRetailerIdAndDeletedAtIsNull(id, retailerId)
                .orElseThrow(() -> new NotFoundException("Sale not found"));
        sale.setDeletedAt(LocalDateTime.now());
        saleRepository.save(sale);
    }

    private SaleDto toDto(Sale s, Long retailerId) {
        String customerName = null;
        if (s.getCustomerId() != null) {
            customerName = customerRepository.findByIdAndRetailerIdAndDeletedAtIsNull(s.getCustomerId(), retailerId)
                    .map(Customer::getName).orElse("Walk-in Customer");
        }

        List<SaleDto.SaleItemDto> itemDtos = s.getItems().stream().map(si -> {
            String itemName = itemRepository.findByIdAndRetailerIdAndDeletedAtIsNull(si.getItemId(), retailerId)
                    .map(Item::getName).orElse("Unknown");
            return SaleDto.SaleItemDto.builder()
                    .itemId(si.getItemId())
                    .itemName(itemName)
                    .quantity(si.getQuantity())
                    .unitPrice(si.getUnitSellingPrice())
                    //.total(si.getAmount())
                    .unitCostPrice(si.getUnitCostPrice())
                    .build();
        }).toList();

        return SaleDto.builder()
                .id(s.getId())
                .billNumber("BILL-" + s.getId())
                .customerId(s.getCustomerId())
                .customerName(customerName != null ? customerName : "Walk-in Customer")
                .saleDate(s.getSaleDate() != null ? s.getSaleDate().toString() : null)
                .totalAmount(s.getTotalAmount())
                .discount(s.getDiscount())
                .finalAmount(s.getFinalAmount())
                .paymentMethod(s.getPaymentMethod())
                .paymentStatus(s.getPaymentStatus())
                .paidAmount(s.getPaidAmount())
                .itemsCount(s.getItems().size())
                .notes(s.getNotes())
                .items(itemDtos)
                .build();
    }
}
