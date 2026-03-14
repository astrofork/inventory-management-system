package com.kirana.repository;

import com.kirana.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SaleRepository extends JpaRepository<Sale, Long> {
    List<Sale> findByRetailerIdAndDeletedAtIsNullOrderBySaleDateDesc(Long retailerId);
    Optional<Sale> findByIdAndRetailerIdAndDeletedAtIsNull(Long id, Long retailerId);
    long countByRetailerIdAndDeletedAtIsNull(Long retailerId);

    @Query("SELECT COALESCE(SUM(s.finalAmount), 0) FROM Sale s WHERE s.retailerId = :retailerId AND s.deletedAt IS NULL AND s.saleDate BETWEEN :start AND :end")
    BigDecimal sumSalesByRetailerIdAndDateRange(@Param("retailerId") Long retailerId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.retailerId = :retailerId AND s.deletedAt IS NULL AND s.saleDate BETWEEN :start AND :end")
    long countSalesByRetailerIdAndDateRange(@Param("retailerId") Long retailerId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<Sale> findByRetailerIdAndDeletedAtIsNullAndSaleDateBetweenOrderBySaleDateDesc(Long retailerId, LocalDateTime start, LocalDateTime end);
}
