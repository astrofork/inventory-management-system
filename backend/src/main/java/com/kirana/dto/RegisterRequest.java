package com.kirana.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "Email is required")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotBlank(message = "Owner name is required")
    private String ownerName;

    @NotBlank(message = "Business name is required")
    private String businessName;

    @NotBlank(message = "Phone number is required")
    private String phoneNumber;

    private String address;
    private String gstNumber;
    private String businessType;
}
