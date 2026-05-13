package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.entity.UserUnlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Set;

public interface UserUnlockRepository extends JpaRepository<UserUnlock, Long> {

    List<UserUnlock> findByUser(User user);

    boolean existsByUserAndUnlockKey(User user, String unlockKey);

    @Query("select unlock.unlockKey from UserUnlock unlock where unlock.user = :user")
    Set<String> findKeysByUser(User user);
}
