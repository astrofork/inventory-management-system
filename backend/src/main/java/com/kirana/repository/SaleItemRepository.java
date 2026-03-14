package com.kirana.repository;

import com.kirana.entity.SaleItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.util.List;

public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {
    List<SaleItem> findBySaleId(Long saleId);

    @Query("SELECT COALESCE(SUM(si.profit), 0) FROM SaleItem si WHERE si.sale.retailerId = :retailerId AND si.sale.deletedAt IS NULL")
    BigDecimal sumProfitByRetailerId(@Param("retailerId") Long retailerId);
}
