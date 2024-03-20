<?php
   @session_start();
   $_SESSION['login'] = true;
   unset($_SESSION['login']);
   session_destroy;
   header("location:index.php")
?>