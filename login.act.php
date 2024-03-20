<?php

   extract($_POST);
  // $senha = md5($senha);

   require('connect.php');

   $busca = mysqli_query($con, "Select * from `tb_cliente` where `email` = '$email'");
   @session_start();
   if($busca->num_rows == 1){
     $contato = mysqli_fetch_array($busca);
   
     
     if($senha === $contato['senha']) { 
       echo "Seu Email e Senha estão corretos";
       $_SESSION['login'] = true;
       $_SESSION['nome'] = $contato['nome'];
       $target = "location:listar.php";
    } else {
     $msg = "Email ou Senha estão incorretos!";
     $target = "location:login.php";
   }
   

   } else {
     $msg = "Email ou Senha estão incorretos!";
     $target = "location:login.php";
   }


   $_SESSION['msg'] = $msg;
   header($target);