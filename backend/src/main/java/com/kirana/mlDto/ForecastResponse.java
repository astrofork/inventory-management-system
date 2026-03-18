package com.kirana.mlDto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ForecastResponse {
  private List<ForecastPoint> forecast;
  private Double totalPredicted;
  private Double avgDaily;

  @Data
  @JsonIgnoreProperties(ignoreUnknown = true)
  public static class ForecastPoint{
    private String ds;
    private Double yhat;
    private Double yhatLower;
    private Double yhatUpper;
  }

}

  
