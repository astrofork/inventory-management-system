package com.kirana.repository;

import com.kirana.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface PurchaseOrderRepository extends JpaRepository<PurchaseOrder, Long> {
    List<PurchaseOrder> findByRetailerIdAndDeletedAtIsNullOrderByOrderDateDesc(Long retailerId);
    Optional<PurchaseOrder> findByIdAndRetailerIdAndDeletedAtIsNull(Long id, Long retailerId);
    List<PurchaseOrder> findByRetailerIdAndStatusAndDeletedAtIsNull(Long retailerId, String status);
    List<PurchaseOrder> findByRetailerIdAndSupplierIdAndDeletedAtIsNullOrderByOrderDateDesc(Long retailerId, Long supplierId);
}
