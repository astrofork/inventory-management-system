package com.kirana.repository;

import com.kirana.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;


public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    List<PurchaseOrder> findByRetailerIdAndDeletedAtIsNullOrderByOrderDateDesc(Long retailerId);
    Optional<PurchaseOrder> findByIdAndRetailerIdAndDeletedAtIsNull(Long id, Long retailerId);
    List<PurchaseOrder> findByRetailerIdAndStatusAndDeletedAtIsNull(Long retailerId, String status);
    List<PurchaseOrder> findByRetailerIdAndSupplierIdAndDeletedAtIsNullOrderByOrderDateDesc(Long retailerId, Long supplierId);


  @Query("""
      SELECT COALESCE(SUM(po.totalAmount), 0)
      FROM PurchaseOrder po
      WHERE po.retailerId = :retailerId
        AND po.orderDate BETWEEN :start AND :end
        AND po.status = 'received'
        AND po.deletedAt IS NULL
      """)
  BigDecimal sumPurchasesByRetailerIdAndDateRange(
      @Param("retailerId") Long retailerId,
      @Param("start")      LocalDateTime start,
      @Param("end")        LocalDateTime end
  );


  @Query("""
      SELECT COALESCE(SUM(po.totalAmount - po.paidAmount), 0)
      FROM PurchaseOrder po
      WHERE po.retailerId = :retailerId
        AND po.paymentStatus IN ('pending', 'partial')
        AND po.deletedAt IS NULL
      """)
  BigDecimal sumPendingPaymentsByRetailerId(
      @Param("retailerId") Long retailerId
  );


}
