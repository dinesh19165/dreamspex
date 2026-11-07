package com.dreamspex.notification;

import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.entity.User; import com.dreamspex.security.CurrentUser; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import java.util.List; import static com.dreamspex.prescription.PrescriptionDtos.*;
@Service
public class NotificationService {
 private final NotificationRepository notifications; private final CurrentUser current;
 public NotificationService(NotificationRepository n,CurrentUser c){notifications=n;current=c;}
 @Transactional public void create(User user,String type,String title,String message){Notification n=new Notification();n.setUser(user);n.setType(type);n.setTitle(title);n.setMessage(message);notifications.save(n);}
 @Transactional(readOnly=true) public List<NotificationResponse> list(org.springframework.security.core.Authentication a){return notifications.findByUserIdOrderByCreatedAtDesc(current.require(a).getId()).stream().map(n->new NotificationResponse(n.getId(),n.getType(),n.getTitle(),n.getMessage(),n.getCreatedAt(),n.getReadAt())).toList();}
 @Transactional public void markRead(org.springframework.security.core.Authentication a,String id){Notification n=notifications.findById(id).filter(x->x.getUser().getId().equals(current.require(a).getId())).orElseThrow();n.setReadAt(java.time.Instant.now());}
}
