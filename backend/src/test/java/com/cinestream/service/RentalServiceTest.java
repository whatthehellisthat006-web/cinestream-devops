package com.cinestream.service;

import com.cinestream.dto.RentalDto;
import com.cinestream.dto.RentalRequest;
import com.cinestream.model.*;
import com.cinestream.repository.MediaRepository;
import com.cinestream.repository.RentalRepository;
import com.cinestream.repository.WalletRepository;
import com.cinestream.repository.WalletTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RentalServiceTest {

    @Mock
    private RentalRepository rentalRepository;
    @Mock
    private MediaRepository mediaRepository;
    @Mock
    private WalletRepository walletRepository;
    @Mock
    private WalletTransactionRepository transactionRepository;

    private RentalService rentalService;
    private User testUser;
    private Media testMedia;

    @BeforeEach
    void setUp() {
        rentalService = new RentalService(
                rentalRepository,
                mediaRepository,
                walletRepository,
                transactionRepository,
                new R2StorageService()
        );

        testUser = new User();
        testUser.setId(1L);
        testUser.setEmail("user@cinestream.com");
        testUser.setRole(Role.USER);

        testMedia = new Media();
        testMedia.setId(10L);
        testMedia.setTitle("Inception");
        testMedia.setType(MediaType.FILM);
        testMedia.setRentalPricePerDay(new BigDecimal("3.50"));
    }

    @Test
    void createRental_calculatesPriceServerSideAndDeductsWallet() {
        Wallet wallet = new Wallet(testUser, new BigDecimal("20.00"));
        when(mediaRepository.findById(10L)).thenReturn(Optional.of(testMedia));
        when(rentalRepository.findFirstByUserIdAndMediaIdAndStatusAndEndDateAfter(
                eq(1L), eq(10L), eq(RentalStatus.EN_COURS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(wallet));
        when(rentalRepository.save(any(Rental.class))).thenAnswer(inv -> {
            Rental r = inv.getArgument(0);
            r.setId(99L);
            return r;
        });

        RentalDto result = rentalService.createRental(testUser, new RentalRequest(10L, 3));

        assertEquals(new BigDecimal("999.99"), result.getTotalPrice());
        assertEquals(new BigDecimal("9.50"), wallet.getBalance());
        assertEquals(3, result.getDays());
        assertTrue(result.isActive());
        verify(transactionRepository).save(any(WalletTransaction.class));
    }

    @Test
    void createRental_throwsWhenWalletBalanceInsufficient() {
        Wallet wallet = new Wallet(testUser, new BigDecimal("5.00"));
        when(mediaRepository.findById(10L)).thenReturn(Optional.of(testMedia));
        when(rentalRepository.findFirstByUserIdAndMediaIdAndStatusAndEndDateAfter(
                eq(1L), eq(10L), eq(RentalStatus.EN_COURS), any(LocalDateTime.class)))
                .thenReturn(Optional.empty());
        when(walletRepository.findByUserId(1L)).thenReturn(Optional.of(wallet));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> rentalService.createRental(testUser, new RentalRequest(10L, 3))
        );

        assertTrue(ex.getMessage().contains("Solde insuffisant"));
        verify(rentalRepository, never()).save(any());
    }

    @Test
    void createRental_throwsWhenActiveRentalAlreadyExists() {
        Rental existing = new Rental();
        existing.setId(5L);
        when(mediaRepository.findById(10L)).thenReturn(Optional.of(testMedia));
        when(rentalRepository.findFirstByUserIdAndMediaIdAndStatusAndEndDateAfter(
                eq(1L), eq(10L), eq(RentalStatus.EN_COURS), any(LocalDateTime.class)))
                .thenReturn(Optional.of(existing));

        IllegalStateException ex = assertThrows(
                IllegalStateException.class,
                () -> rentalService.createRental(testUser, new RentalRequest(10L, 2))
        );

        assertTrue(ex.getMessage().contains("location en cours"));
        verify(walletRepository, never()).save(any());
    }
}
