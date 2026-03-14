package com.kirana.repository;

import com.kirana.entity.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    List<Supplier> findByRetailerIdAndDeletedAtIsNull(Long retailerId);
    Optional<Supplier> findByIdAndRetailerIdAndDeletedAtIsNull(Long id, Long retailerId);
    long countByRetailerIdAndDeletedAtIsNull(Long retailerId);
}
