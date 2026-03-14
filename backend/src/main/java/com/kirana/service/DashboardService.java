package com.kirana.service;

import com.kirana.dto.DashboardResponse;
import com.kirana.entity.Item;
import com.kirana.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final ItemRepository itemRepository;
    private final PurchaseOrderRepository purchaseOrderRepository;

    public DashboardResponse getDashboard(Long retailerId) {
        LocalDate today = LocalDate.now();
        LocalDateTime todayStart = today.atStartOfDay();
        LocalDateTime todayEnd = today.atTime(LocalTime.MAX);
        LocalDateTime monthStart = today.withDayOfMonth(1).atStartOfDay();

        // Today's data
        BigDecimal todaySales = saleRepository.sumSalesByRetailerIdAndDateRange(retailerId, todayStart, todayEnd);
        long todayBills = saleRepository.countSalesByRetailerIdAndDateRange(retailerId, todayStart, todayEnd);

        // This month's data
        BigDecimal monthSales = saleRepository.sumSalesByRetailerIdAndDateRange(retailerId, monthStart, todayEnd);
        long monthBills = saleRepository.countSalesByRetailerIdAndDateRange(retailerId, monthStart, todayEnd);

        // Inventory data
        List<Item> allItems = itemRepository.findByRetailerIdAndDeletedAtIsNull(retailerId);
        long totalItems = allItems.size();
        long lowStockItems = allItems.stream()
                .filter(i -> i.getIsActive() && i.getCurrentStock().compareTo(i.getMinStockThreshold()) <= 0 && i.getCurrentStock().compareTo(BigDecimal.ZERO) > 0)
                .count();
        long outOfStockItems = allItems.stream()
                .filter(i -> i.getIsActive() && i.getCurrentStock().compareTo(BigDecimal.ZERO) <= 0)
                .count();
        BigDecimal totalStockValue = allItems.stream()
                .map(i -> i.getPurchasePrice().multiply(i.getCurrentStock()))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return DashboardResponse.builder()
                .today(DashboardResponse.TodaySummary.builder()
                        .sales(todaySales)
                        .bills(todayBills)
                        .profit(BigDecimal.ZERO) // Simplified
                        .cashSales(BigDecimal.ZERO)
                        .digitalSales(BigDecimal.ZERO)
                        .build())
                .thisMonth(DashboardResponse.MonthSummary.builder()
                        .sales(monthSales)
                        .purchases(BigDecimal.ZERO)
                        .profit(BigDecimal.ZERO)
                        .bills(monthBills)
                        .build())
                .inventory(DashboardResponse.InventorySummary.builder()
                        .totalItems(totalItems)
                        .lowStockItems(lowStockItems)
                        .outOfStockItems(outOfStockItems)
                        .totalStockValue(totalStockValue)
                        .build())
                .payments(DashboardResponse.PaymentsSummary.builder()
                        .pendingSupplierPayments(BigDecimal.ZERO)
                        .pendingCustomerPayments(BigDecimal.ZERO)
                        .build())
                .build();
    }
}
