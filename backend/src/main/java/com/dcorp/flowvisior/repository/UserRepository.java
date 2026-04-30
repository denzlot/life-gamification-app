package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

// как искать пользователя в БД
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername (String username);
    Boolean existsByUsername(String username);
}
