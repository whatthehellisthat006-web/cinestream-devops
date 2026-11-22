package com.cinestream.security;

import com.cinestream.model.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        String testSecret = "test_secret_key_for_cinestream_unit_tests_at_least_32_chars";
        jwtTokenProvider = new JwtTokenProvider(testSecret, 3600000L);
    }

    @Test
    void createAndValidateToken_succeedsForValidUser() {
        String token = jwtTokenProvider.createToken(1L, "user@cinestream.com", Role.USER);

        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("user@cinestream.com", jwtTokenProvider.getEmailFromToken(token));
    }

    @Test
    void validateToken_returnsFalseForTamperedOrInvalidToken() {
        assertFalse(jwtTokenProvider.validateToken("not.a.valid.jwt"));
        assertFalse(jwtTokenProvider.validateToken(""));
    }
}
